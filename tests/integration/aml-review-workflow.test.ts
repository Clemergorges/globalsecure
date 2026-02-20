import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  checkAdmin: jest.fn(),
}));

import { checkAdmin } from '@/lib/auth';
import { GET as amlQueueGet, POST as amlQueuePost } from '@/app/api/admin/aml/review-queue/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('AML review workflow', () => {
  const adminId = '00000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: adminId },
      update: {},
      create: { id: adminId, email: 'admin.workflow@test.com', passwordHash: 'hash', firstName: 'Admin', lastName: 'Workflow', emailVerified: true },
    });
  });

  afterAll(async () => {
    await prisma.amlReviewNote.deleteMany({ where: { authorId: adminId } });
    await prisma.auditLog.deleteMany({ where: { userId: adminId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
  });

  test('assign, note and decide a case', async () => {
    const email = `${uid('test_amlwf')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', emailVerified: true },
      select: { id: true },
    });

    const created = await prisma.amlReviewCase.create({
      data: {
        userId: user.id,
        reason: 'VELOCITY',
        contextJson: { amountUsd: 10 },
        status: 'PENDING',
        riskLevel: 'HIGH',
        riskScore: 80,
        slaDueAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true },
    });

    (checkAdmin as unknown as jest.Mock).mockResolvedValue({ userId: adminId, email: 'admin.workflow@test.com', role: 'ADMIN', isAdmin: true });

    const assignRes = await amlQueuePost(
      new Request('http://localhost/api/admin/aml/review-queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'ASSIGN', id: created.id, assignedToId: adminId }),
      }),
    );
    expect(assignRes.status).toBe(200);
    const assignBody = await assignRes.json();
    expect(assignBody.success).toBe(true);
    expect(assignBody.case.assignedToId).toBe(adminId);
    expect(assignBody.case.status).toBe('IN_REVIEW');

    const noteRes = await amlQueuePost(
      new Request('http://localhost/api/admin/aml/review-queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_NOTE', id: created.id, body: 'Reviewed documents, ok.' }),
      }),
    );
    const noteBody = await noteRes.json();
    expect(noteBody.success).toBe(true);
    expect(noteBody.note.caseId).toBe(created.id);

    const decideRes = await amlQueuePost(
      new Request('http://localhost/api/admin/aml/review-queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'DECIDE', id: created.id, decision: 'CLEAR', decisionNote: 'No red flags.' }),
      }),
    );
    const decideBody = await decideRes.json();
    expect(decideBody.success).toBe(true);
    expect(decideBody.case.status).toBe('CLEARED');
    expect(decideBody.case.decision).toBe('CLEAR');
    expect(decideBody.case.decidedById).toBe(adminId);
    expect(decideBody.case.decidedAt).toBeTruthy();

    const listRes = await amlQueueGet(new Request('http://localhost/api/admin/aml/review-queue?status=CLEARED&take=50'));
    const listBody = await listRes.json();
    expect(listBody.cases.some((c: any) => c.id === created.id)).toBe(true);

    await prisma.amlReviewNote.deleteMany({ where: { caseId: created.id } });
    await prisma.amlReviewCase.delete({ where: { id: created.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
