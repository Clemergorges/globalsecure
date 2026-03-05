import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { logAudit, logger } from '@/lib/logger';
import { callPartnerWithBreaker, PartnerTemporarilyUnavailableError } from '@/lib/services/partner-circuit-breaker';
import { isSupportedKycCountry, normalizeCountryCode } from '@/lib/kyc/supported-countries';
import { env } from '@/lib/config/env';

type StripeIdentityErrorCode =
  | 'STRIPE_NOT_CONFIGURED'
  | 'KYC_STRIPE_IDENTITY_DISABLED'
  | 'KYC_COUNTRY_MISSING'
  | 'KYC_COUNTRY_INVALID'
  | 'KYC_UNSUPPORTED_COUNTRY'
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

function normalizeDevOrigin(origin: string): string {
  try {
    const u = new URL(origin);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (isLocal && u.port && u.port !== '3000') {
      return `${u.protocol}//${u.hostname}:3000`;
    }
    return `${u.protocol}//${u.host}`;
  } catch {
    return origin;
  }
}

function resolveReturnUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return `${normalizeDevOrigin(configured).replace(/\/+$/, '')}/dashboard/settings/kyc`;
  const inferred = inferRequestOrigin(req.headers);
  if (inferred) return `${normalizeDevOrigin(inferred).replace(/\/+$/, '')}/dashboard/settings/kyc`;
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

  const featureEnabled = (process.env.KYC_STRIPE_IDENTITY_ENABLED ?? 'true').trim().toLowerCase();
  if (featureEnabled === 'false' || featureEnabled === '0') {
    return NextResponse.json(
      { error: 'Stripe Identity disabled', code: 'KYC_STRIPE_IDENTITY_DISABLED' satisfies StripeIdentityErrorCode },
      { status: 503 },
    );
  }

  const userId = session.userId;
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const method = 'POST';
  const path = '/api/kyc/stripe-identity';

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, country: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawCountry = user.country?.trim() || '';
    if (!rawCountry) {
      await logAudit({
        userId,
        action: 'KYC_STRIPE_IDENTITY_CREATE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { code: 'KYC_COUNTRY_MISSING' },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Country required', code: 'KYC_COUNTRY_MISSING' satisfies StripeIdentityErrorCode },
        { status: 400 },
      );
    }

    const country = normalizeCountryCode(rawCountry);
    if (country.length !== 2) {
      await logAudit({
        userId,
        action: 'KYC_STRIPE_IDENTITY_CREATE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { code: 'KYC_COUNTRY_INVALID', country },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Invalid country', code: 'KYC_COUNTRY_INVALID' satisfies StripeIdentityErrorCode },
        { status: 400 },
      );
    }

    if (!isSupportedKycCountry(country)) {
      await logAudit({
        userId,
        action: 'KYC_STRIPE_IDENTITY_CREATE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { code: 'KYC_UNSUPPORTED_COUNTRY', country },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Unsupported country', code: 'KYC_UNSUPPORTED_COUNTRY' satisfies StripeIdentityErrorCode },
        { status: 400 },
      );
    }

    const stripeSecretKey = env.stripeSecretKey();
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
      apiVersion: '2026-01-28.clover' as any,
    });

    const keyMode = stripeSecretKey.startsWith('sk_test_') ? 'test' : stripeSecretKey.startsWith('sk_live_') ? 'live' : 'unknown';

    const flow =
      process.env[`STRIPE_IDENTITY_VERIFICATION_FLOW_${country}`]?.trim() ||
      process.env.STRIPE_IDENTITY_VERIFICATION_FLOW_DEFAULT?.trim() ||
      process.env.STRIPE_VERIFICATION_FLOW_ID?.trim() ||
      null;

    const baseParams = {
      client_reference_id: userId,
      metadata: {
        userId,
        country,
      },
      provided_details: {
        email: user.email,
      },
      return_url: resolveReturnUrl(req),
    } satisfies Stripe.Identity.VerificationSessionCreateParams;

    const createWithoutFlowParams: Stripe.Identity.VerificationSessionCreateParams = {
      ...baseParams,
      type: 'document',
      options: {
        document: {
          require_id_number: country === 'US',
          require_matching_selfie: true,
          require_live_capture: true,
        },
      },
    };

    const createWithFlowParams: Stripe.Identity.VerificationSessionCreateParams | null = flow
      ? {
          ...baseParams,
          verification_flow: flow,
        }
      : null;

    const isMissingFlowError = (err: unknown): boolean => {
      if (!err || typeof err !== 'object') return false;
      const anyErr = err as any;
      return (
        anyErr?.type === 'StripeInvalidRequestError' &&
        (anyErr?.param === 'verification_flow' || String(anyErr?.message || '').includes('No such VerificationFlow')) &&
        (anyErr?.code === 'resource_missing' || anyErr?.statusCode === 400)
      );
    };

    logger.info(
      {
        userId,
        country,
        keyMode,
        hasFlow: !!flow,
        returnUrl: baseParams.return_url,
      },
      'stripe_identity_create_start',
    );

    let verificationSession: Stripe.Identity.VerificationSession;
    try {
      const params = createWithFlowParams ?? createWithoutFlowParams;
      verificationSession = await callPartnerWithBreaker('stripe', 'identity.verificationSessions.create', async () =>
        stripe.identity.verificationSessions.create(params),
      );
    } catch (err) {
      if (createWithFlowParams && isMissingFlowError(err)) {
        logger.warn(
          { userId, country, keyMode, verificationFlow: flow, reason: 'MISSING_FLOW_FALLBACK' },
          'stripe_identity_create_fallback_without_flow',
        );
        verificationSession = await callPartnerWithBreaker('stripe', 'identity.verificationSessions.create', async () =>
          stripe.identity.verificationSessions.create(createWithoutFlowParams),
        );
      } else {
        throw err;
      }
    }

    const urlHost = verificationSession.url ? (() => {
      try {
        return new URL(verificationSession.url).host;
      } catch {
        return null;
      }
    })() : null;

    logger.info(
      {
        userId,
        country,
        keyMode,
        stripeObject: 'verification_session',
        stripeVerificationId: verificationSession.id,
        status: (verificationSession as any).status || null,
        urlHost,
      },
      'stripe_identity_create_success',
    );

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

    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'PENDING',
        kycLevel: 1,
      },
    });

    await logAudit({
      userId,
      action: 'KYC_STRIPE_IDENTITY_CREATE',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { stripeVerificationId: verificationSession.id, country },
    });

    return NextResponse.json({ 
      url: verificationSession.url,
      clientSecret: verificationSession.client_secret,
      id: verificationSession.id 
    });

  } catch (error) {
    if (error instanceof PartnerTemporarilyUnavailableError) {
      await logAudit({
        userId,
        action: 'KYC_STRIPE_IDENTITY_CREATE',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { code: error.code },
      }).catch(() => {});
      return NextResponse.json({ error: error.code, code: error.code }, { status: 503 });
    }
    const mapped = mapStripeError(error);
    const anyErr = error && typeof error === 'object' ? (error as any) : null;
    logger.error(
      {
        userId,
        code: mapped.code,
        stripeType: mapped.stripeType || null,
        stripe: anyErr
          ? {
              name: anyErr?.name || null,
              type: anyErr?.type || null,
              message: anyErr?.message || null,
              code: anyErr?.code || null,
              param: anyErr?.param || null,
              statusCode: anyErr?.statusCode || null,
              requestId: anyErr?.requestId || null,
            }
          : { message: String(error) },
      },
      'stripe_identity_create_error',
    );
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
    const status =
      mapped.code === 'STRIPE_RATE_LIMIT' ? 503 : mapped.code.startsWith('STRIPE_') ? 502 : 500;
    return NextResponse.json(
      { error: mapped.code.startsWith('STRIPE_') ? 'Stripe Identity unavailable' : 'Failed to start verification', code: mapped.code },
      { status },
    );
  }
}
