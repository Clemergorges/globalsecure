import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string' || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.userId;

  try {
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
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/kyc`,
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

    return NextResponse.json({ 
      url: verificationSession.url,
      clientSecret: verificationSession.client_secret,
      id: verificationSession.id 
    });

  } catch (error) {
    console.error('Stripe Identity Error:', error);
    return NextResponse.json({ error: 'Failed to start verification' }, { status: 500 });
  }
}
