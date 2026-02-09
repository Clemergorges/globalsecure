import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_dummy').trim(), {
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

    // Calculate Fees (3.5% + 0.30 fixed)
    const fixedFee = 0.30;
    const variableFeePercent = 0.035;
    const feeAmount = (amount * variableFeePercent) + fixedFee;
    const baseMinor = Math.round(amount * 100);
    const feeMinor = Math.round(feeAmount * 100);
    
    // Total charge = Amount + Fees
    // But we credit only 'amount' to the wallet.

    // Criar Sessão do Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'GlobalSecure Top-up',
              description: 'Crédito na Carteira',
            },
            unit_amount: baseMinor,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Taxa de Processamento',
              description: 'Taxa de cartão de crédito (3.5% + 0.30)',
            },
            unit_amount: feeMinor,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=cancel`,
      metadata: {
        userId: session.userId as string,
        type: 'WALLET_TOPUP',
        base_amount_minor: String(baseMinor),
        surcharge_minor: String(feeMinor)
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
