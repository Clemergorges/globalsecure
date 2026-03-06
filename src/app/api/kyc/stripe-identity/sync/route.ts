import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/services/stripe';

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

  let body: { sessionId?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  if (!sessionId.startsWith('vs_')) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
  }

  const doc = await prisma.kYCDocument.findUnique({
    where: { stripeVerificationId: sessionId },
    select: { id: true, userId: true, status: true },
  });

  if (!doc || doc.userId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const s = await getStripe().identity.verificationSessions.retrieve(sessionId);
  const stripeStatus = s.status;

  if (stripeStatus === 'verified') {
    if (doc.status !== 'APPROVED') {
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

        await tx.account.updateMany({
          where: { userId: doc.userId },
          data: { status: 'ACTIVE' },
        });
      });
    }

    return NextResponse.json({ status: 'APPROVED', stripeStatus }, { status: 200 });
  }

  if (stripeStatus === 'requires_input') {
    if (doc.status !== 'REVIEW') {
      await prisma.$transaction(async (tx) => {
        await tx.kYCDocument.update({
          where: { id: doc.id },
          data: { status: 'REVIEW', rejectionReason: s.last_error?.code || 'REQUIRES_INPUT' },
        });
        await tx.user.update({
          where: { id: doc.userId },
          data: { kycStatus: 'REVIEW' },
        });
      });
    }
    return NextResponse.json({ status: 'REVIEW', stripeStatus, lastError: s.last_error || null }, { status: 200 });
  }

  if (stripeStatus === 'canceled') {
    if (doc.status === 'PENDING') {
      await prisma.kYCDocument.update({
        where: { id: doc.id },
        data: { status: 'REJECTED', rejectionReason: 'CANCELED' },
      });
    }
    return NextResponse.json({ status: 'REJECTED', stripeStatus }, { status: 200 });
  }

  return NextResponse.json({ status: doc.status, stripeStatus }, { status: 200 });
}
