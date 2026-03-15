import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { templates, sendEmail } from '@/lib/services/email';
import { Prisma } from '@prisma/client';

function otpPepper() {
  return process.env.CLAIM_OTP_PEPPER || process.env.OTP_PEPPER || '';
}

function hmac(value: string) {
  const pepper = otpPepper();
  return crypto.createHmac('sha256', pepper).update(value).digest('hex');
}

function generateOtp() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

function timingSafeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function shouldRequireClaimStepUp(params: { amount: Prisma.Decimal; currency: string }) {
  if (process.env.CLAIM_STEPUP_ENABLED === 'false') return false;
  const thresholdRaw = process.env.CLAIM_STEPUP_AMOUNT_THRESHOLD_USD;
  const threshold = thresholdRaw ? Number(thresholdRaw) : 0;
  if (!Number.isFinite(threshold) || threshold <= 0) return true;
  if (params.currency.toUpperCase() !== 'USD') return true;
  return params.amount.toNumber() >= threshold;
}

export async function issueClaimStepUpOtp(params: {
  claimLinkId: string;
  recipientEmail: string;
  ipAddress: string;
  userAgent: string;
}) {
  const ttlMinRaw = process.env.CLAIM_OTP_TTL_MINUTES;
  const ttlMinutes = ttlMinRaw ? Number(ttlMinRaw) : 10;
  const ttl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? Math.min(ttlMinutes, 60) : 10;
  const maxAttemptsRaw = process.env.CLAIM_OTP_MAX_ATTEMPTS;
  const maxAttempts = maxAttemptsRaw ? Number(maxAttemptsRaw) : 5;
  const max = Number.isFinite(maxAttempts) && maxAttempts > 0 ? Math.min(Math.floor(maxAttempts), 10) : 5;

  const code = generateOtp();
  const codeHash = hmac(code);
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

  const challenge = await prisma.claimOtpChallenge.create({
    data: {
      claimLinkId: params.claimLinkId,
      recipientEmail: params.recipientEmail.toLowerCase().trim(),
      codeHash,
      expiresAt,
      maxAttempts: max,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    select: { id: true, expiresAt: true },
  });

  await sendEmail({
    to: params.recipientEmail,
    subject: 'GlobalSecure: código de segurança do cartão',
    html: templates.claimStepUpOtp(code, ttl),
  });

  return challenge;
}

export async function verifyClaimStepUpOtp(params: {
  claimLinkId: string;
  otp: string;
  ipAddress: string;
  userAgent: string;
}) {
  const otp = params.otp.trim();
  if (!/^[0-9]{6}$/.test(otp)) return { ok: false as const, error: 'INVALID_OTP' as const };

  const challenge = await prisma.claimOtpChallenge.findFirst({
    where: { claimLinkId: params.claimLinkId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!challenge) return { ok: false as const, error: 'OTP_NOT_FOUND' as const };
  if (challenge.attempts >= challenge.maxAttempts) return { ok: false as const, error: 'OTP_LOCKED' as const };

  const ok = timingSafeEqualHex(challenge.codeHash, hmac(otp));
  if (!ok) {
    await prisma.claimOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 }, ipAddress: params.ipAddress, userAgent: params.userAgent },
    });
    return { ok: false as const, error: 'OTP_INVALID' as const, attemptsRemaining: Math.max(challenge.maxAttempts - (challenge.attempts + 1), 0) };
  }

  await prisma.claimOtpChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date(), ipAddress: params.ipAddress, userAgent: params.userAgent },
  });
  return { ok: true as const };
}

