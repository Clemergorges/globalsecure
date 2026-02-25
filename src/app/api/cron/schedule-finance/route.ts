import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getConfiguredFxPairs } from '@/lib/services/fx-engine';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  }

  const now = new Date();
  const recentCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const reconcileMinIntervalMinutes = Number(process.env.TREASURY_RECONCILE_MIN_INTERVAL_MINUTES || 60);
  const reconcileCutoff = new Date(Date.now() - Math.max(1, reconcileMinIntervalMinutes) * 60 * 1000);

  const [recentFx, recentTreasury, recentReconcile] = await Promise.all([
    prisma.job.findFirst({
      where: { type: 'REFRESH_FX_RATES', status: { in: ['PENDING', 'PROCESSING'] }, createdAt: { gte: recentCutoff } },
      select: { id: true },
    }),
    prisma.job.findFirst({
      where: { type: 'TREASURY_CHECK', status: { in: ['PENDING', 'PROCESSING'] }, createdAt: { gte: recentCutoff } },
      select: { id: true },
    }),
    prisma.job.findFirst({
      where: { type: 'TREASURY_RECONCILE', status: { in: ['PENDING', 'PROCESSING'] }, createdAt: { gte: reconcileCutoff } },
      select: { id: true },
    }),
  ]);

  const created: string[] = [];

  if (!recentFx) {
    const job = await prisma.job.create({
      data: {
        type: 'REFRESH_FX_RATES',
        payload: { pairs: getConfiguredFxPairs() },
        status: 'PENDING',
        runAt: now,
      },
      select: { id: true },
    });
    created.push(job.id);
  }

  if (!recentTreasury) {
    const job = await prisma.job.create({
      data: {
        type: 'TREASURY_CHECK',
        payload: {},
        status: 'PENDING',
        runAt: now,
      },
      select: { id: true },
    });
    created.push(job.id);
  }

  if (!recentReconcile) {
    const snapshotMaxAgeMinutes = Number(process.env.TREASURY_SNAPSHOT_MAX_AGE_MIN || 180);
    const warnPct = Number(process.env.TREASURY_DIVERGENCE_WARN_PCT || 1);
    const critPct = Number(process.env.TREASURY_DIVERGENCE_CRIT_PCT || 2);
    const emitAudit = (process.env.TREASURY_RECONCILE_EMIT_AUDIT || 'true').toLowerCase() !== 'false';

    const job = await prisma.job.create({
      data: {
        type: 'TREASURY_RECONCILE',
        payload: { snapshotMaxAgeMinutes, warnPct, critPct, emitAudit },
        status: 'PENDING',
        runAt: now,
      },
      select: { id: true },
    });
    created.push(job.id);
  }

  return NextResponse.json({ scheduled: created.length, jobIds: created });
}
