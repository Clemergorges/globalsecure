import { prisma } from '@/lib/db';

export type OperationalFlagKey =
  | 'TREASURY_HALT_DEPOSITS_WITHDRAWS'
  | 'YIELD_ALLOCATIONS_PAUSED';

export async function isOperationalFlagEnabled(key: OperationalFlagKey) {
  try {
    const row = await prisma.operationalFlag.findUnique({ where: { key } });
    return row?.enabled === true;
  } catch {
    return false;
  }
}

export async function setOperationalFlag(
  key: OperationalFlagKey,
  enabled: boolean,
  data?: { reason?: string | null; metadata?: any },
) {
  return prisma.operationalFlag.upsert({
    where: { key },
    create: { key, enabled, reason: data?.reason || null, metadata: data?.metadata || undefined },
    update: { enabled, reason: data?.reason || null, metadata: data?.metadata || undefined },
  });
}
