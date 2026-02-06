import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  // @ts-expect-error Stripe version mismatch
  apiVersion: '2024-12-18.acacia',
});

const topUpSchema = z.object({
  amount: z.number().positive().min(5), // Minimo 5 EUR/USD
  currency: z.enum(['EUR', 'USD', 'GBP'])
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string' || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { amount, currency } = topUpSchema.parse(body);

    // Criar Sessão do Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'GlobalSecure Top-up',
              description: 'Adicionar saldo à carteira',
            },
            unit_amount: Math.round(amount * 100), // Centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=cancel`,
      metadata: {
        userId: session.userId as string,
        type: 'WALLET_TOPUP'
      },
    });

    // Salvar intenção no banco
    await prisma.topUp.create({
      data: {
        userId: session.userId as string,
        amount: amount,
        currency: currency,
        stripeSessionId: checkoutSession.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Dados inválidos', details: (error as any).errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
