import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export type RiskGateResult =
  | { allowed: true }
  | { allowed: false; status: number; code: string; details?: Record<string, any> };

function asIso2(country: string) {
  return country.trim().toUpperCase();
}

function getRegionCountries(region: string) {
  const r = region.trim().toUpperCase();
  if (r === 'EU') {
    return new Set([
      'AT',
      'BE',
      'BG',
      'HR',
      'CY',
      'CZ',
      'DK',
      'EE',
      'FI',
      'FR',
      'DE',
      'GR',
      'HU',
      'IE',
      'IT',
      'LV',
      'LT',
      'LU',
      'MT',
      'NL',
      'PL',
      'PT',
      'RO',
      'SK',
      'SI',
      'ES',
      'SE',
      'NO',
      'CH',
      'GB',
      'IS',
    ]);
  }
  if (r === 'US') return new Set(['US', 'CA']);
  if (r === 'BR') return new Set(['BR']);
  if (r === 'APAC') return new Set(['JP', 'SG', 'AU', 'NZ', 'HK', 'KR', 'ID', 'MY', 'PH', 'TH', 'VN', 'TW']);
  return null;
}

export async function checkUserGeoFraudContext(userId: string, observedCountry: string | null, context: { source: 'MERCHANT' | 'DEVICE'; mcc?: string | null }) {
  if (!observedCountry) return { allowed: true } as const;
  const obs = asIso2(observedCountry);
  if (!obs) return { allowed: true } as const;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { country: true, travelModeEnabled: true, travelRegion: true },
  });
  if (!user) return { allowed: false, status: 404, code: 'USER_NOT_FOUND' } as const;

  const habitual = user.country ? asIso2(user.country) : null;
  if (!habitual) return { allowed: true } as const;
  if (habitual === obs) return { allowed: true } as const;

  if (user.travelModeEnabled) {
    const region = user.travelRegion ? user.travelRegion.trim().toUpperCase() : null;
    const regionCountries = region ? getRegionCountries(region) : null;
    if (regionCountries && !regionCountries.has(obs)) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TRAVEL_MODE_BLOCKED',
          status: '403',
          metadata: {
            reason: 'OUTSIDE_TRAVEL_REGION',
            observedCountry: obs,
            habitualCountry: habitual,
            travelRegion: region,
            source: context.source,
            mcc: context.mcc || null,
          },
        },
      });
      logger.warn(
        { userId, observedCountry: obs, habitualCountry: habitual, travelRegion: region, source: context.source, mcc: context.mcc || null },
        'Geofraud blocked (outside travel region)',
      );
      return {
        allowed: false,
        status: 403,
        code: 'GEOFRAUD_OUTSIDE_TRAVEL_REGION',
        details: { observedCountry: obs, habitualCountry: habitual, travelRegion: region, source: context.source, mcc: context.mcc || null },
      } as const;
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TRAVEL_MODE_RELAXED',
        status: 'ALLOWED',
        metadata: {
          observedCountry: obs,
          habitualCountry: habitual,
          travelRegion: region,
          source: context.source,
          mcc: context.mcc || null,
        },
      },
    });
    logger.info(
      { userId, observedCountry: obs, habitualCountry: habitual, travelRegion: region, source: context.source, mcc: context.mcc || null },
      'Geofraud relaxed (travel mode)',
    );
    return { allowed: true } as const;
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'TRAVEL_MODE_BLOCKED',
      status: '403',
      metadata: { reason: 'COUNTRY_MISMATCH', observedCountry: obs, habitualCountry: habitual, source: context.source, mcc: context.mcc || null },
    },
  });
  logger.warn(
    { userId, observedCountry: obs, habitualCountry: habitual, source: context.source, mcc: context.mcc || null },
    'Geofraud blocked (country mismatch)',
  );
  return {
    allowed: false,
    status: 403,
    code: 'GEOFRAUD_COUNTRY_MISMATCH',
    details: { observedCountry: obs, habitualCountry: habitual, source: context.source, mcc: context.mcc || null },
  } as const;
}

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
