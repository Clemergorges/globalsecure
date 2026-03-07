import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { env } from '@/lib/config/env';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/services/stripe';
import { logger } from '@/lib/logger';

function mapStripeDocType(stripeType: string | null | undefined): 'PASSPORT' | 'NATIONAL_ID' | 'RESIDENCE_PERMIT' | 'DRIVERS_LICENSE' | undefined {
  if (!stripeType) return undefined;
  const t = stripeType.toLowerCase();
  if (t.includes('passport')) return 'PASSPORT';
  if (t.includes('driver_license')) return 'DRIVERS_LICENSE';
  if (t.includes('id_card')) return 'NATIONAL_ID';
  if (t.includes('residence')) return 'RESIDENCE_PERMIT';
  return 'NATIONAL_ID';
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string' || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (env.kycStripeIdentityDemoMode()) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { kycStatus: 'APPROVED', kycLevel: 2, kycCompletedAt: new Date() },
    });
    return NextResponse.json({ success: true, status: 'APPROVED', kycStatus: 'APPROVED' }, { status: 200 });
  }

  let body: { sessionId?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (sessionId && !sessionId.startsWith('vs_')) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
  }

  const doc = sessionId
    ? await prisma.kYCDocument.findUnique({
        where: { stripeVerificationId: sessionId },
        select: { id: true, userId: true, status: true, stripeVerificationId: true },
      })
    : await prisma.kYCDocument.findFirst({
        where: { userId: session.userId, stripeVerificationId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, userId: true, status: true, stripeVerificationId: true },
      });

  if (!doc || doc.userId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (doc.status === 'APPROVED') {
    await prisma.user.update({
      where: { id: doc.userId },
      data: { kycStatus: 'APPROVED', kycLevel: 2, kycCompletedAt: new Date() },
    });
    return NextResponse.json({ success: true, status: 'APPROVED', kycStatus: 'APPROVED' }, { status: 200 });
  }

  const sid = doc.stripeVerificationId ?? '';
  if (!sid) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const s = await getStripe().identity.verificationSessions.retrieve(sid);
  const stripeStatus = s.status;

  if (stripeStatus === 'verified') {
    const issuingCountry = s.verified_outputs?.address?.country;
    const idNumber = s.verified_outputs?.id_number;
    const docType = s.verified_outputs?.id_number_type;

    await prisma.$transaction(async (tx) => {
      await tx.kYCDocument.update({
        where: { id: doc.id },
        data: {
          status: 'APPROVED',
          verifiedAt: new Date(),
          documentNumber: idNumber || 'HIDDEN',
          issuingCountry: issuingCountry || 'UNKNOWN',
        },
      });

      await tx.user.update({
        where: { id: doc.userId },
        data: {
          kycStatus: 'APPROVED',
          kycLevel: 2,
          kycCompletedAt: new Date(),
          documentNumber: idNumber || undefined,
          documentType: mapStripeDocType(docType),
        },
      });
    });

    logger.info({ userId: doc.userId, stripeStatus }, 'kyc.stripe_identity.sync.approved');
    return NextResponse.json({ success: true, status: 'APPROVED', kycStatus: 'APPROVED', stripeStatus }, { status: 200 });
  }

  if (stripeStatus === 'requires_input') {
    return NextResponse.json(
      { success: true, status: doc.status, kycStatus: doc.status, stripeStatus, lastError: s.last_error || null },
      { status: 200 },
    );
  }

  if (stripeStatus === 'canceled') {
    if (doc.status === 'PENDING') {
      await prisma.kYCDocument.update({
        where: { id: doc.id },
        data: { status: 'REJECTED', rejectionReason: 'CANCELED' },
      });
    }
    return NextResponse.json({ success: true, status: 'REJECTED', kycStatus: 'REJECTED', stripeStatus }, { status: 200 });
  }

  return NextResponse.json({ success: true, status: doc.status, kycStatus: doc.status, stripeStatus }, { status: 200 });
}
