import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/rbac';
import { logAudit } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const actor = await requireRole(req, [UserRole.ADMIN, UserRole.COMPLIANCE]);
  if (actor instanceof NextResponse) return actor;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'PENDING';
  const riskLevel = url.searchParams.get('riskLevel');
  const assignedToId = url.searchParams.get('assignedToId');
  const overdue = url.searchParams.get('overdue') === 'true';
  const take = Math.min(Number(url.searchParams.get('take') || 50), 200);

  const cases = await prisma.amlReviewCase.findMany({
    where: {
      status: status as any,
      riskLevel: riskLevel ? (riskLevel as any) : undefined,
      assignedToId: assignedToId || undefined,
      slaDueAt: overdue ? { lt: new Date() } : undefined,
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      user: { select: { email: true, yieldEnabled: true } },
      notes: { orderBy: { createdAt: 'desc' }, take: 5 },
      assignedTo: { select: { email: true } },
      decidedBy: { select: { email: true } },
    },
  });

  return NextResponse.json({ cases });
}

const legacyUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PENDING', 'IN_REVIEW', 'BLOCKED', 'CLEARED']),
});

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('ASSIGN'),
    id: z.string().uuid(),
    assignedToId: z.string().uuid().nullable(),
  }),
  z.object({
    action: z.literal('ADD_NOTE'),
    id: z.string().uuid(),
    body: z.string().min(1).max(5000),
  }),
  z.object({
    action: z.literal('DECIDE'),
    id: z.string().uuid(),
    decision: z.enum(['CLEAR', 'BLOCK']),
    decisionNote: z.string().max(5000).optional(),
  }),
  z.object({
    action: z.literal('SET_STATUS'),
    id: z.string().uuid(),
    status: z.enum(['PENDING', 'IN_REVIEW', 'BLOCKED', 'CLEARED']),
  }),
]);

export async function POST(req: NextRequest) {
  const actor = await requireRole(req, [UserRole.ADMIN, UserRole.COMPLIANCE]);
  if (actor instanceof NextResponse) return actor;
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const method = req.method;
  const path = req.nextUrl.pathname;

  const body = await req.json();
  const actionParsed = actionSchema.safeParse(body);
  if (actionParsed.success) {
    const data = actionParsed.data;

    if (data.action === 'ASSIGN') {
      const updated = await prisma.amlReviewCase.update({
        where: { id: data.id },
        data: {
          assignedToId: data.assignedToId,
          status: data.assignedToId ? 'IN_REVIEW' : undefined,
        },
      });

      logAudit({
        action: 'AML_CASE_ASSIGN',
        userId: actor.userId,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { caseId: updated.id, targetUserId: updated.userId, assignedToId: data.assignedToId },
      });

      return NextResponse.json({ success: true, case: updated });
    }

    if (data.action === 'ADD_NOTE') {
      const note = await prisma.amlReviewNote.create({
        data: { caseId: data.id, authorId: actor.userId, body: data.body },
      });

      logAudit({
        action: 'AML_CASE_NOTE',
        userId: actor.userId,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { caseId: data.id, noteId: note.id },
      });

      return NextResponse.json({ success: true, note });
    }

    if (data.action === 'DECIDE') {
      const mappedStatus = data.decision === 'CLEAR' ? 'CLEARED' : 'BLOCKED';
      const updated = await prisma.amlReviewCase.update({
        where: { id: data.id },
        data: {
          status: mappedStatus,
          decision: data.decision,
          decidedAt: new Date(),
          decidedById: actor.userId,
          decisionNote: data.decisionNote || null,
        },
      });

      logAudit({
        action: 'AML_CASE_DECISION',
        userId: actor.userId,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { caseId: updated.id, targetUserId: updated.userId, decision: data.decision, status: mappedStatus },
      });

      return NextResponse.json({ success: true, case: updated });
    }

    if (data.action === 'SET_STATUS') {
      const updated = await prisma.amlReviewCase.update({
        where: { id: data.id },
        data: { status: data.status },
      });

      logAudit({
        action: 'AML_CASE_STATUS',
        userId: actor.userId,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { caseId: updated.id, targetUserId: updated.userId, status: data.status },
      });

      return NextResponse.json({ success: true, case: updated });
    }
  }

  const legacyParsed = legacyUpdateSchema.safeParse(body);
  if (!legacyParsed.success) return NextResponse.json({ error: 'Validation Error' }, { status: 400 });

  const updated = await prisma.amlReviewCase.update({
    where: { id: legacyParsed.data.id },
    data: { status: legacyParsed.data.status },
  });

  logAudit({
    action: 'AML_CASE_STATUS',
    userId: actor.userId,
    status: 'SUCCESS',
    ipAddress,
    userAgent,
    method,
    path,
    metadata: { caseId: updated.id, targetUserId: updated.userId, status: legacyParsed.data.status, legacy: true },
  });

  return NextResponse.json({ success: true, case: updated });
}
