import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { logAudit } from '@/lib/logger';

type StripeIdentityErrorCode =
  | 'STRIPE_NOT_CONFIGURED'
  | 'STRIPE_API_ERROR'
  | 'STRIPE_AUTH_ERROR'
  | 'STRIPE_RATE_LIMIT'
  | 'STRIPE_CONNECTION_ERROR'
  | 'STRIPE_INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

function inferRequestOrigin(headers: Headers): string | null {
  const origin = headers.get('origin');
  if (origin) return origin;

  const proto = headers.get('x-forwarded-proto') || headers.get('x-forwarded-protocol');
  const host = headers.get('x-forwarded-host') || headers.get('host');
  if (!host) return null;
  const scheme = proto ? proto.split(',')[0].trim() : 'http';
  return `${scheme}://${host}`;
}

function resolveReturnUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return `${configured.replace(/\/+$/, '')}/dashboard/settings/kyc`;
  const inferred = inferRequestOrigin(req.headers);
  if (inferred) return `${inferred.replace(/\/+$/, '')}/dashboard/settings/kyc`;
  return 'http://localhost:3000/dashboard/settings/kyc';
}

function mapStripeError(err: unknown): { code: StripeIdentityErrorCode; message: string; stripeType?: string } {
  if (err && typeof err === 'object') {
    const anyErr = err as { type?: unknown; message?: unknown; code?: unknown };
    const stripeType = typeof anyErr.type === 'string' ? anyErr.type : undefined;
    const message = typeof anyErr.message === 'string' ? anyErr.message : 'Stripe error';

    if (stripeType === 'StripeAuthenticationError') return { code: 'STRIPE_AUTH_ERROR', message, stripeType };
    if (stripeType === 'StripeRateLimitError') return { code: 'STRIPE_RATE_LIMIT', message, stripeType };
    if (stripeType === 'StripeConnectionError') return { code: 'STRIPE_CONNECTION_ERROR', message, stripeType };
    if (stripeType === 'StripeInvalidRequestError') return { code: 'STRIPE_INVALID_REQUEST', message, stripeType };
    if (stripeType?.startsWith('Stripe')) return { code: 'STRIPE_API_ERROR', message, stripeType };
  }

  return { code: 'UNKNOWN_ERROR', message: 'Unknown error' };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string' || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.userId;
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const method = 'POST';
  const path = '/api/kyc/stripe-identity';

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecretKey) {
      await logAudit({
        userId,
        action: 'KYC_STRIPE_IDENTITY_CREATE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { code: 'STRIPE_NOT_CONFIGURED' },
      });
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' satisfies StripeIdentityErrorCode },
        { status: 503 },
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    });

    // 1. Create Verification Session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId: userId,
      },
      options: {
        document: {
          require_id_number: true,
          require_matching_selfie: true,
          require_live_capture: true, // Liveness check
        },
      },
      // Redirect back to dashboard after completion
      return_url: resolveReturnUrl(req),
    });

    // 2. Save intent to DB
    // We create a PENDING document linked to this verification
    await prisma.kYCDocument.create({
      data: {
        userId,
        documentType: 'STRIPE_IDENTITY',
        documentNumber: 'PENDING', // Will be updated via webhook
        issuingCountry: 'UNKNOWN', // Will be updated via webhook
        stripeVerificationId: verificationSession.id,
        status: 'PENDING'
      }
    });

    await logAudit({
      userId,
      action: 'KYC_STRIPE_IDENTITY_CREATE',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { stripeVerificationId: verificationSession.id },
    });

    return NextResponse.json({ 
      url: verificationSession.url,
      clientSecret: verificationSession.client_secret,
      id: verificationSession.id 
    });

  } catch (error) {
    const mapped = mapStripeError(error);
    await logAudit({
      userId,
      action: 'KYC_STRIPE_IDENTITY_CREATE',
      status: 'FAILURE',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { code: mapped.code, stripeType: mapped.stripeType },
    });
    return NextResponse.json(
      { error: 'Failed to start verification', code: mapped.code },
      { status: mapped.code === 'STRIPE_AUTH_ERROR' ? 502 : 500 },
    );
  }
}
