import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';

export async function checkLegalHold(userId: string) {
  const blockingCase = await prisma.amlReviewCase.findFirst({
    where: {
      userId,
      riskLevel: { in: ['HIGH', 'CRITICAL'] },
      status: { in: ['PENDING', 'IN_REVIEW', 'BLOCKED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, riskLevel: true, status: true, reason: true, createdAt: true }
  });

  return {
    blocked: Boolean(blockingCase),
    blockingCase,
  };
}

function buildAnonymizedEmail(userId: string) {
  const salt = crypto.randomBytes(6).toString('hex');
  return `anon+${userId}.${salt}@deleted.invalid`;
}

export async function createAndRunDeletionJob(params: {
  userId: string;
  ip?: string;
  userAgent?: string;
}) {
  const hold = await checkLegalHold(params.userId);
  if (hold.blocked) {
    await logAudit({
      userId: params.userId,
      action: 'GDPR_ERASE_BLOCKED',
      status: '409',
      ipAddress: params.ip,
      userAgent: params.userAgent,
      path: '/api/user/privacy/erase',
      metadata: { blockingCase: hold.blockingCase }
    });
    return { ok: false as const, reason: 'LEGAL_HOLD' as const, blockingCase: hold.blockingCase };
  }

  const startedAt = new Date();
  const anonymizedEmail = buildAnonymizedEmail(params.userId);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.deletionJob.create({
        data: {
          userId: params.userId,
          status: 'PROCESSING',
        }
      });

      await tx.user.update({
        where: { id: params.userId },
        data: {
          email: anonymizedEmail,
          emailVerified: false,
          passwordHash: `DELETED:${crypto.randomBytes(16).toString('hex')}`,
          firstName: null,
          lastName: null,
          phone: null,
          phoneVerified: false,
          dateOfBirth: null,
          countryOfBirth: null,
          nationality: null,
          documentType: null,
          documentNumber: null,
          documentExpiry: null,
          birthDate: null,
          documentId: null,
          address: null,
          city: null,
          postalCode: null,
          marketingConsent: false,
          cookieConsent: false,
          deletedAt: startedAt,
          anonymizedAt: startedAt,
          anonymizationVersion: 1,
          emailAnonymized: true,
          phoneAnonymized: true,
        }
      });

      await tx.address.deleteMany({ where: { userId: params.userId } });

      await tx.deletionJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });

      return { jobId: job.id };
    });

    await logAudit({
      userId: params.userId,
      action: 'GDPR_ERASE_COMPLETED',
      status: '200',
      ipAddress: params.ip,
      userAgent: params.userAgent,
      path: '/api/user/privacy/erase',
      metadata: { jobId: result.jobId }
    });

    return { ok: true as const, jobId: result.jobId };
  } catch (e: any) {
    await logAudit({
      userId: params.userId,
      action: 'GDPR_ERASE_FAILED',
      status: '500',
      ipAddress: params.ip,
      userAgent: params.userAgent,
      path: '/api/user/privacy/erase',
      metadata: { message: String(e?.message || 'UNKNOWN') }
    });
    throw e;
  }
}

