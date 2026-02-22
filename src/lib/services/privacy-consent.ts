import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';

export type ConsentPreferences = {
  gdprConsent: boolean;
  marketingConsent: boolean;
  cookieConsent: boolean;
};

export async function getOrCreateCurrentConsentDocument(params: {
  locale: string;
  createdByUserId?: string;
}) {
  const locale = (params.locale || 'en').toLowerCase();

  const existing = await prisma.consentDocument.findFirst({
    where: { locale },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) return existing;

  const created = await prisma.consentDocument.create({
    data: {
      version: 'v1',
      locale,
      renderedTextHash: 'bootstrap',
      createdByUserId: params.createdByUserId,
    }
  });

  return created;
}

export async function getConsentState(params: {
  userId: string;
  locale?: string;
}) {
  const [user, doc, lastRecords] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: { gdprConsent: true, marketingConsent: true, cookieConsent: true }
    }),
    getOrCreateCurrentConsentDocument({ locale: params.locale || 'en' }),
    prisma.userConsentRecord.findMany({
      where: { userId: params.userId },
      orderBy: { acceptedAt: 'desc' },
      take: 50,
    })
  ]);

  return {
    preferences: {
      gdprConsent: user?.gdprConsent ?? false,
      marketingConsent: user?.marketingConsent ?? false,
      cookieConsent: user?.cookieConsent ?? false,
    },
    currentDocument: { id: doc.id, version: doc.version, locale: doc.locale, renderedTextHash: doc.renderedTextHash },
    recentRecords: lastRecords,
  };
}

export async function updateConsentState(params: {
  userId: string;
  locale?: string;
  ip?: string;
  userAgent?: string;
  next: Partial<ConsentPreferences>;
}) {
  const current = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { gdprConsent: true, marketingConsent: true, cookieConsent: true }
  });

  if (!current) {
    throw new Error('USER_NOT_FOUND');
  }

  if (params.next.gdprConsent === false) {
    throw new Error('GDPR_TERMS_REQUIRED');
  }

  const desired: ConsentPreferences = {
    gdprConsent: params.next.gdprConsent ?? current.gdprConsent,
    marketingConsent: params.next.marketingConsent ?? current.marketingConsent,
    cookieConsent: params.next.cookieConsent ?? current.cookieConsent,
  };

  const doc = await getOrCreateCurrentConsentDocument({
    locale: params.locale || 'en',
    createdByUserId: params.userId,
  });

  const changes = [
    { type: 'GDPR_TERMS' as const, from: current.gdprConsent, to: desired.gdprConsent },
    { type: 'MARKETING' as const, from: current.marketingConsent, to: desired.marketingConsent },
    { type: 'COOKIES' as const, from: current.cookieConsent, to: desired.cookieConsent },
  ].filter(c => c.from !== c.to);

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: params.userId },
      data: {
        gdprConsent: desired.gdprConsent,
        gdprConsentAt: desired.gdprConsent ? new Date() : null,
        marketingConsent: desired.marketingConsent,
        cookieConsent: desired.cookieConsent,
      }
    });

    if (changes.length > 0) {
      await tx.userConsentRecord.createMany({
        data: changes.map(c => ({
          userId: params.userId,
          consentType: c.type,
          documentVersion: doc.version,
          acceptedAt: new Date(),
          ip: params.ip,
          userAgent: params.userAgent,
        })),
      });
    }

    return { changes, desired, docVersion: doc.version };
  });

  await logAudit({
    userId: params.userId,
    action: 'GDPR_CONSENT_UPDATE',
    status: '200',
    ipAddress: params.ip,
    userAgent: params.userAgent,
    path: '/api/user/privacy/consents',
    metadata: {
      changes: result.changes,
      documentVersion: result.docVersion,
    }
  });

  return result;
}

