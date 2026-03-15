import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/logger';
import { getCardData } from '@/lib/services/card';
import { closeEtherFiPosition } from '@/lib/services/etherfiService';
import { sendEmail, templates } from '@/lib/services/email';
import { countClaimEventsSince, logClaimEvent } from '@/lib/services/claim-events';
import { ClaimLinkEventType } from '@prisma/client';
import { issueClaimStepUpOtp, shouldRequireClaimStepUp } from '@/lib/services/claim-stepup';

const unlockSchema = z.object({
  unlockCode: z
    .string()
    .min(6)
    .max(6)
    .regex(/^[a-zA-Z0-9]{6}$/),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const proto = req.headers.get('x-forwarded-proto');

  if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
    return NextResponse.json({ ok: false, error: 'HTTPS_REQUIRED' }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 400 });
  }

  const inputCode = parsed.data.unlockCode.toLowerCase();

  const dbUnlockWindowMinRaw = process.env.CLAIM_UNLOCK_ATTEMPTS_WINDOW_MINUTES;
  const dbUnlockWindowMin = dbUnlockWindowMinRaw ? Number(dbUnlockWindowMinRaw) : 15;
  const unlockWindowMin = Number.isFinite(dbUnlockWindowMin) && dbUnlockWindowMin > 0 ? Math.min(Math.floor(dbUnlockWindowMin), 24 * 60) : 15;
  const dbUnlockMaxRaw = process.env.CLAIM_UNLOCK_MAX_ATTEMPTS;
  const dbUnlockMax = dbUnlockMaxRaw ? Number(dbUnlockMaxRaw) : 6;
  const unlockMax = Number.isFinite(dbUnlockMax) && dbUnlockMax > 0 ? Math.min(Math.floor(dbUnlockMax), 50) : 6;

  const dbStepUpWindowMinRaw = process.env.CLAIM_STEPUP_SEND_WINDOW_MINUTES;
  const dbStepUpWindowMin = dbStepUpWindowMinRaw ? Number(dbStepUpWindowMinRaw) : 15;
  const stepUpWindowMin = Number.isFinite(dbStepUpWindowMin) && dbStepUpWindowMin > 0 ? Math.min(Math.floor(dbStepUpWindowMin), 24 * 60) : 15;
  const dbStepUpMaxRaw = process.env.CLAIM_STEPUP_SEND_MAX;
  const dbStepUpMax = dbStepUpMaxRaw ? Number(dbStepUpMaxRaw) : 3;
  const stepUpSendMax = Number.isFinite(dbStepUpMax) && dbStepUpMax > 0 ? Math.min(Math.floor(dbStepUpMax), 20) : 3;

  async function unlockAndReveal(claimLinkId: string, cardId: string, brand: string, createdAt: Date) {
    const updated = await prisma.$transaction(async (tx) => {
      const lockedClaim = await tx.claimLink.findUnique({
        where: { token },
        include: { virtualCard: true },
      });

      if (!lockedClaim || !lockedClaim.virtualCard) {
        return { ok: false as const, error: 'CLAIM_NOT_FOUND' as const };
      }

      if (lockedClaim.status === 'CLAIMED' || lockedClaim.claimedAt || lockedClaim.virtualCard.unlockedAt) {
        return { ok: false as const, error: 'CLAIM_ALREADY_CLAIMED' as const };
      }

      if (lockedClaim.expiresAt <= new Date() || lockedClaim.status === 'EXPIRED' || lockedClaim.status === 'CANCELLED') {
        return { ok: false as const, error: 'CLAIM_EXPIRED' as const };
      }

      await tx.virtualCard.update({
        where: { id: lockedClaim.virtualCard.id },
        data: { unlockedAt: new Date() },
      });

      await tx.claimLink.update({
        where: { id: lockedClaim.id },
        data: { status: 'CLAIMED', claimedAt: new Date(), claimedByIP: ip },
      });

      return {
        ok: true as const,
        claimId: lockedClaim.id,
        cardId: lockedClaim.virtualCard.id,
        last4: lockedClaim.virtualCard.last4,
        brand: lockedClaim.virtualCard.brand,
      };
    });

    if (!updated.ok) {
      const status = updated.error === 'CLAIM_EXPIRED' ? 410 : updated.error === 'CLAIM_ALREADY_CLAIMED' ? 409 : 404;
      return NextResponse.json({ ok: false, error: updated.error }, { status });
    }

    const transferId = cardId ? (await prisma.virtualCard.findUnique({ where: { id: cardId }, select: { transferId: true } }))?.transferId : null;
    if (transferId) {
      const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
      if (transfer?.yieldPositionId) {
        try {
          await closeEtherFiPosition({ positionId: transfer.yieldPositionId, reason: 'OTP_UNLOCK' });
        } catch (err: any) {
          await logAudit({
            action: 'ETHERFI_CLOSE_FAILED',
            status: 'ERROR',
            ipAddress: ip,
            userAgent,
            method: 'POST',
            path: `/api/claim/${token}/unlock`,
            metadata: { transferId, positionId: transfer.yieldPositionId, message: String(err?.message || err) },
          });
        }
      }
    }

    const cardData = await getCardData(updated.cardId);

    logClaimEvent({
      claimLinkId,
      type: ClaimLinkEventType.REVEAL_SUCCESS,
      ipAddress: ip,
      userAgent,
      metadata: { cardId: updated.cardId, last4: updated.last4, brand: updated.brand },
    }).catch(() => {});

    await logAudit({
      action: 'CLAIM_UNLOCKED_SUCCESS',
      status: '200',
      ipAddress: ip,
      userAgent,
      method: 'POST',
      path: `/api/claim/${token}/unlock`,
      metadata: { claimId: updated.claimId, cardId: updated.cardId, last4: updated.last4, brand: updated.brand, duration: Date.now() - createdAt.getTime() },
    });

    try {
      if (transferId) {
        const transfer = await prisma.transfer.findUnique({
          where: { id: transferId },
          select: { recipientEmail: true, recipientName: true },
        });
        const to = transfer?.recipientEmail || null;
        const isValidEmail = typeof to === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) && to !== 'unknown' && to !== 'claim-placeholder@globalsecuresend.com';
        if (isValidEmail) {
          const card = await prisma.virtualCard.findUnique({ where: { id: updated.cardId }, select: { amount: true, amountUsed: true, currency: true } });
          const amountAvailable = card ? (card.amount.toNumber() - card.amountUsed.toNumber()).toFixed(2) : '0.00';
          await sendEmail({
            to,
            subject: 'Your GlobalSecure virtual card is active',
            html: templates.cardActivated({
              recipientName: transfer?.recipientName || undefined,
              currency: (card?.currency || 'USD').toUpperCase(),
              amountAvailable,
            }),
          });
        }
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      cardNumber: cardData.pan,
      cvc: cardData.cvv,
      expMonth: cardData.expMonth,
      expYear: cardData.expYear,
      brand,
    });
  }

  try {
    const claim = await prisma.claimLink.findUnique({
      where: { token },
      include: { virtualCard: true }
    });

    if (!claim) {
      return NextResponse.json({ ok: false, error: 'CLAIM_NOT_FOUND' }, { status: 404 });
    }

    if (!claim.virtualCard) {
      return NextResponse.json({ ok: false, error: 'CARD_NOT_FOUND' }, { status: 404 });
    }

    const now = new Date();
    if (claim.expiresAt <= now || claim.status === 'EXPIRED' || claim.status === 'CANCELLED') {
      return NextResponse.json({ ok: false, error: 'CLAIM_EXPIRED' }, { status: 410 });
    }

    if (claim.status === 'CLAIMED' || claim.claimedAt || claim.virtualCard.unlockedAt) {
      return NextResponse.json({ ok: false, error: 'CLAIM_ALREADY_CLAIMED' }, { status: 409 });
    }

    const maxUsdRaw = process.env.CLAIM_PUBLIC_MAX_USD;
    const maxUsd = maxUsdRaw ? Number(maxUsdRaw) : null;
    if (maxUsd && Number.isFinite(maxUsd) && maxUsd > 0 && claim.currency.toUpperCase() === 'USD') {
      if (claim.amount.toNumber() > maxUsd) {
        await logAudit({
          action: 'CLAIM_BLOCKED_LIMIT',
          status: '403',
          ipAddress: ip,
          userAgent,
          method: 'POST',
          path: `/api/claim/${token}/unlock`,
          metadata: { claimId: claim.id, maxUsd, amount: claim.amount.toNumber() },
        });
        return NextResponse.json({ ok: false, error: 'CLAIM_AMOUNT_LIMIT' }, { status: 403 });
      }
    }

    const expected = (claim.virtualCard.unlockCode || '').toLowerCase();

    if (expected !== inputCode) {
      const since = new Date(Date.now() - unlockWindowMin * 60 * 1000);
      const recentFails = await countClaimEventsSince({
        claimLinkId: claim.id,
        type: ClaimLinkEventType.UNLOCK_CODE_FAILED,
        since,
      });
      if (recentFails >= unlockMax) {
        return NextResponse.json({ ok: false, error: 'TOO_MANY_ATTEMPTS', attemptsRemaining: 0 }, { status: 429 });
      }

      const rl = await checkRateLimit(`claim_unlock:${token}:${ip}`, 3, 15 * 60);
      const attemptsRemaining = rl.remaining;
      const retryAfterSeconds = Math.max(0, Math.ceil((rl.reset - Date.now()) / 1000));
      const rateLimitHeaders = {
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'Retry-After': String(retryAfterSeconds),
      };

      await logAudit({
        action: 'CLAIM_UNLOCK_FAILED',
        status: '400',
        ipAddress: ip,
        userAgent,
        method: 'POST',
        path: `/api/claim/${token}/unlock`,
        metadata: {
          claimId: claim.id,
          cardId: claim.virtualCard.id,
          reason: 'INVALID_CODE',
          last4: claim.virtualCard.last4,
          brand: claim.virtualCard.brand,
          attemptsRemaining
        }
      });

      logClaimEvent({
        claimLinkId: claim.id,
        type: ClaimLinkEventType.UNLOCK_CODE_FAILED,
        ipAddress: ip,
        userAgent,
        metadata: { attemptsRemaining },
      }).catch(() => {});

      if (!rl.success) {
        return NextResponse.json(
          { ok: false, error: 'TOO_MANY_ATTEMPTS', attemptsRemaining: 0 },
          { status: 429, headers: rateLimitHeaders }
        );
      }

      return NextResponse.json(
        { ok: false, error: 'INVALID_UNLOCK_CODE', attemptsRemaining },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    logClaimEvent({
      claimLinkId: claim.id,
      type: ClaimLinkEventType.UNLOCK_CODE_OK,
      ipAddress: ip,
      userAgent,
      metadata: { cardId: claim.virtualCard.id },
    }).catch(() => {});

    if (shouldRequireClaimStepUp({ amount: claim.amount, currency: claim.currency })) {
      const since = new Date(Date.now() - stepUpWindowMin * 60 * 1000);
      const recentSends = await countClaimEventsSince({
        claimLinkId: claim.id,
        type: ClaimLinkEventType.STEPUP_OTP_SENT,
        since,
      });
      if (recentSends >= stepUpSendMax) {
        return NextResponse.json({ ok: false, error: 'TOO_MANY_ATTEMPTS' }, { status: 429 });
      }

      const rl = await checkRateLimit(`claim_stepup_send:${token}:${ip}`, 3, 15 * 60);
      if (!rl.success) {
        return NextResponse.json({ ok: false, error: 'TOO_MANY_ATTEMPTS' }, { status: 429 });
      }

      const transferId = claim.virtualCard?.transferId;
      const transfer = transferId
        ? await prisma.transfer.findUnique({ where: { id: transferId }, select: { recipientEmail: true } })
        : null;
      const recipientEmail = transfer?.recipientEmail || null;
      const isValidEmail = typeof recipientEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);
      if (!isValidEmail) {
        return NextResponse.json({ ok: false, error: 'RECIPIENT_EMAIL_UNAVAILABLE' }, { status: 409 });
      }

      const challenge = await issueClaimStepUpOtp({
        claimLinkId: claim.id,
        recipientEmail,
        ipAddress: ip,
        userAgent,
      });

      logClaimEvent({
        claimLinkId: claim.id,
        type: ClaimLinkEventType.STEPUP_OTP_SENT,
        ipAddress: ip,
        userAgent,
        metadata: { challengeId: challenge.id, expiresAt: challenge.expiresAt.toISOString() },
      }).catch(() => {});

      return NextResponse.json(
        { ok: false, error: 'CLAIM_STEPUP_REQUIRED', challengeId: challenge.id, expiresAt: challenge.expiresAt.toISOString() },
        { status: 401 },
      );
    }

    return unlockAndReveal(claim.id, claim.virtualCard.id, claim.virtualCard.brand, claim.createdAt);
  } catch (error: any) {
    console.error('Claim unlock error:', error);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
