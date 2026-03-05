import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { env } from '@/lib/config/env';

export type OtpPurpose = 'MFA_ENROLL' | 'PASSWORD_CHANGE' | 'CONTACT_CHANGE' | 'HIGH_VALUE_TRANSFER';

export type OtpConsumeResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_FOUND' | 'EXPIRED' | 'LOCKED' | 'INVALID' | 'ALREADY_USED' };

function hashOtp(code: string) {
  const pepper = env.otpPepper();
  return crypto.createHash('sha256').update(`${code}.${pepper}`).digest('hex');
}

function generate6Digits() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export class OtpChallengeService {
  async create(params: {
    userId: string;
    purpose: OtpPurpose;
    ttlSeconds: number;
    maxAttempts: number;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const ttlSeconds = Math.max(60, Math.min(params.ttlSeconds, 60 * 60));
    const maxAttempts = Math.max(3, Math.min(params.maxAttempts, 20));

    const code = generate6Digits();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await prisma.otpChallenge.create({
      data: {
        userId: params.userId,
        purpose: params.purpose,
        codeHash,
        expiresAt,
        attempts: 0,
        maxAttempts,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    return { code, expiresAt, ttlSeconds };
  }

  async consume(params: { userId: string; purpose: OtpPurpose; code: string }): Promise<OtpConsumeResult> {
    const codeHash = hashOtp(params.code);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const latest = await tx.otpChallenge.findFirst({
        where: {
          userId: params.userId,
          purpose: params.purpose,
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, codeHash: true, expiresAt: true, attempts: true, maxAttempts: true, usedAt: true },
      });

      if (!latest) return { ok: false as const, reason: 'NOT_FOUND' as const };
      if (latest.usedAt) return { ok: false as const, reason: 'ALREADY_USED' as const };
      if (latest.expiresAt <= now) return { ok: false as const, reason: 'EXPIRED' as const };
      if (latest.attempts >= latest.maxAttempts) return { ok: false as const, reason: 'LOCKED' as const };

      if (latest.codeHash !== codeHash) {
        await tx.otpChallenge.update({
          where: { id: latest.id },
          data: { attempts: { increment: 1 } },
        });
        return { ok: false as const, reason: 'INVALID' as const };
      }

      const updated = await tx.otpChallenge.updateMany({
        where: { id: latest.id, usedAt: null },
        data: { usedAt: now },
      });

      if (updated.count !== 1) return { ok: false as const, reason: 'ALREADY_USED' as const };
      return { ok: true as const };
    });
  }
}
