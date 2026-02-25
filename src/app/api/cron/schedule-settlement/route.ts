import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  }

  const enabled = (process.env.SETTLEMENT_ENGINE_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    return NextResponse.json({ scheduled: 0, jobIds: [], disabled: true });
  }

  const now = new Date();
  const minIntervalMinutes = Number(process.env.SETTLEMENT_JOB_MIN_INTERVAL_MINUTES || 2);
  const recentCutoff = new Date(Date.now() - Math.max(1, minIntervalMinutes) * 60 * 1000);

  const recent = await prisma.job.findFirst({
    where: { type: 'SETTLEMENT_SWEEP', status: { in: ['PENDING', 'PROCESSING'] }, createdAt: { gte: recentCutoff } },
    select: { id: true },
  });

  if (recent) {
    return NextResponse.json({ scheduled: 0, jobIds: [] });
  }

  const batchSize = Number(process.env.SETTLEMENT_BATCH_SIZE || 50);
  const timeoutHours = Number(process.env.SETTLEMENT_TIMEOUT_HOURS || 24);
  const dryRun = process.env.SETTLEMENT_DRY_RUN === 'true';

  const job = await prisma.job.create({
    data: {
      type: 'SETTLEMENT_SWEEP',
      payload: { batchSize, timeoutHours, dryRun },
      status: 'PENDING',
      runAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({ scheduled: 1, jobIds: [job.id] });
}

