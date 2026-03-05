
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
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

export async function GET(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      // @ts-ignore
      where: { id: session.userId },
      select: {
        kycStatus: true,
        kycLevel: true,
        kycDocuments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            stripeVerificationId: true,
            rejectionReason: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const latestDoc = user.kycDocuments[0];

    if (
      latestDoc?.stripeVerificationId &&
      (latestDoc.status === 'PENDING' || latestDoc.status === 'REVIEW')
    ) {
      const s = await getStripe().identity.verificationSessions.retrieve(latestDoc.stripeVerificationId);
      if (s.status === 'verified') {
        const issuingCountry = s.verified_outputs?.address?.country;
        const idNumber = s.verified_outputs?.id_number;
        const docType = s.verified_outputs?.id_number_type;

        await prisma.$transaction(async (tx) => {
          await tx.kYCDocument.update({
            where: { id: latestDoc.id },
            data: {
              status: 'APPROVED',
              verifiedAt: new Date(),
              documentNumber: idNumber || 'HIDDEN',
              issuingCountry: issuingCountry || 'UNKNOWN',
            },
          });

          await tx.user.update({
            // @ts-ignore
            where: { id: session.userId },
            data: {
              kycStatus: 'APPROVED',
              kycLevel: 2,
              kycCompletedAt: new Date(),
              documentNumber: idNumber || undefined,
              documentType: mapStripeDocType(docType),
            },
          });

          // @ts-ignore
          await tx.account.updateMany({ where: { userId: session.userId }, data: { status: 'ACTIVE' } });
        });

        return NextResponse.json({
          status: 'APPROVED',
          level: 2,
          lastSubmission: latestDoc
            ? {
                date: latestDoc.createdAt,
                rejectionReason: latestDoc.rejectionReason,
              }
            : null,
        });
      }
    }

    return NextResponse.json({
      status: user.kycStatus,
      level: user.kycLevel,
      lastSubmission: latestDoc ? {
        date: latestDoc.createdAt,
        rejectionReason: latestDoc.rejectionReason
      } : null
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch KYC status' }, { status: 500 });
  }
}
