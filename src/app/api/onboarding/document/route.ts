import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Endpoint disabled (legacy onboarding flow). Store only documentLast4 + documentNumberHash if needed; use Stripe Identity for verification.',
    },
    { status: 410 },
  );
}
