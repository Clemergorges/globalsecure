import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';
import { z } from 'zod';

export async function GET(req: Request) {
  try {
    await checkAdmin();

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
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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

export async function POST(req: Request) {
  try {
    const admin = await checkAdmin();
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

        await prisma.auditLog.create({
          data: {
            action: 'AML_CASE_ASSIGN',
            userId: admin.userId,
            status: 'SUCCESS',
            metadata: { caseId: updated.id, targetUserId: updated.userId, assignedToId: data.assignedToId },
          },
        });

        return NextResponse.json({ success: true, case: updated });
      }

      if (data.action === 'ADD_NOTE') {
        const note = await prisma.amlReviewNote.create({
          data: { caseId: data.id, authorId: admin.userId, body: data.body },
        });

        await prisma.auditLog.create({
          data: {
            action: 'AML_CASE_NOTE',
            userId: admin.userId,
            status: 'SUCCESS',
            metadata: { caseId: data.id, noteId: note.id },
          },
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
            decidedById: admin.userId,
            decisionNote: data.decisionNote || null,
          },
        });

        await prisma.auditLog.create({
          data: {
            action: 'AML_CASE_DECISION',
            userId: admin.userId,
            status: 'SUCCESS',
            metadata: { caseId: updated.id, targetUserId: updated.userId, decision: data.decision, status: mappedStatus },
          },
        });

        return NextResponse.json({ success: true, case: updated });
      }

      if (data.action === 'SET_STATUS') {
        const updated = await prisma.amlReviewCase.update({
          where: { id: data.id },
          data: { status: data.status },
        });

        await prisma.auditLog.create({
          data: {
            action: 'AML_CASE_STATUS',
            userId: admin.userId,
            status: 'SUCCESS',
            metadata: { caseId: updated.id, targetUserId: updated.userId, status: data.status },
          },
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

    await prisma.auditLog.create({
      data: {
        action: 'AML_CASE_STATUS',
        userId: admin.userId,
        status: 'SUCCESS',
        metadata: { caseId: updated.id, targetUserId: updated.userId, status: legacyParsed.data.status, legacy: true },
      },
    });

    return NextResponse.json({ success: true, case: updated });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
