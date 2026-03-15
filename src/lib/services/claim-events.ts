import { prisma } from '@/lib/db';
import { ClaimLinkEventType } from '@prisma/client';
import { Prisma } from '@prisma/client';

export async function logClaimEvent(params: {
  claimLinkId: string;
  type: ClaimLinkEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await prisma.claimLinkEvent.create({
    data: {
      claimLinkId: params.claimLinkId,
      type: params.type,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function countClaimEventsSince(params: {
  claimLinkId: string;
  type: ClaimLinkEventType;
  since: Date;
}) {
  return prisma.claimLinkEvent.count({
    where: {
      claimLinkId: params.claimLinkId,
      type: params.type,
      createdAt: { gte: params.since },
    },
  });
}
