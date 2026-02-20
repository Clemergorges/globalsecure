import { prisma } from '@/lib/db';

export type RiskGateResult =
  | { allowed: true }
  | { allowed: false; status: number; code: string; details?: Record<string, any> };

export async function checkUserCanTransact(userId: string): Promise<RiskGateResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });

  if (!user) return { allowed: false, status: 404, code: 'USER_NOT_FOUND' };

  if (user.kycStatus === 'REJECTED' || user.kycStatus === 'EXPIRED') {
    return { allowed: false, status: 403, code: 'KYC_BLOCKED', details: { kycStatus: user.kycStatus } };
  }

  const aml = await prisma.amlReviewCase.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'IN_REVIEW'] },
      riskLevel: { in: ['HIGH', 'CRITICAL'] },
    },
    select: { id: true, status: true, riskLevel: true },
    orderBy: { createdAt: 'desc' },
  });

  if (aml) {
    return {
      allowed: false,
      status: 403,
      code: 'AML_REVIEW_PENDING',
      details: { caseId: aml.id, status: aml.status, riskLevel: aml.riskLevel },
    };
  }

  return { allowed: true };
}

