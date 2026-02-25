import crypto from 'crypto';
import { prisma } from '@/lib/db';
type SensitiveActionType =
  | 'SENSITIVE_CHANGE_PASSWORD'
  | 'SENSITIVE_UPDATE_CONTACT'
  | 'SENSITIVE_HIGH_VALUE_TRANSFER';

function otpPepper() {
  return process.env.SENSITIVE_OTP_PEPPER || '';
}

function hashOtp(code: string) {
  return crypto.createHash('sha256').update(`${code}.${otpPepper()}`).digest('hex');
}

function generateCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

export function getSensitiveOtpTtlMinutes() {
  const raw = Number(process.env.SENSITIVE_OTP_TTL_MINUTES || 10);
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  return Math.min(raw, 60);
}

export async function createSensitiveActionOtp(params: {
  userId: string;
  actionType: SensitiveActionType;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const ttlMinutes = getSensitiveOtpTtlMinutes();
  const code = generateCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.sensitiveActionOtp.create({
    data: {
      userId: params.userId,
      actionType: params.actionType,
      codeHash,
      expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });

  return { code, expiresAt, ttlMinutes };
}

export async function consumeSensitiveActionOtp(params: {
  userId: string;
  actionType: SensitiveActionType;
  code: string;
}) {
  const now = new Date();
  const codeHash = hashOtp(params.code);

  return prisma.$transaction(async (tx) => {
    const latest = await tx.sensitiveActionOtp.findFirst({
      where: {
        userId: params.userId,
        actionType: params.actionType,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, expiresAt: true, createdAt: true },
    });

    if (!latest) return { ok: false as const, reason: 'NOT_FOUND' as const };
    if (latest.expiresAt <= now) return { ok: false as const, reason: 'EXPIRED' as const };
    if (latest.codeHash !== codeHash) return { ok: false as const, reason: 'INVALID' as const };

    const updated = await tx.sensitiveActionOtp.updateMany({
      where: { id: latest.id, usedAt: null },
      data: { usedAt: now },
    });

    if (updated.count !== 1) return { ok: false as const, reason: 'ALREADY_USED' as const };
    return { ok: true as const, usedAt: now };
  });
}
