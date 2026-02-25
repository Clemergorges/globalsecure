import { NextRequest, NextResponse } from 'next/server';
import { Prisma, UserRole } from '@prisma/client';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';
import { z } from 'zod';

const schema = z.object({
  fromCurrency: z.string().min(1).max(10),
  toCurrency: z.string().min(1).max(10),
  amount: z.string().min(1).max(50),
});

const FEE_BPS = 180;

function asDecimal(value: string) {
  const d = new Prisma.Decimal(value);
  if (d.isNeg()) throw new Error('INVALID_AMOUNT');
  return d;
}

export async function POST(req: NextRequest) {
  const session = await validateSession(req);
  if (!session) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role !== UserRole.END_USER) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });

  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const method = req.method;
  const path = req.nextUrl.pathname;

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    logAudit({ userId: session.userId, action: 'FX_QUOTE', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason: 'VALIDATION' } });
    return NextResponse.json({ code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const fromCurrency = parsed.fromCurrency.toUpperCase();
  const toCurrency = parsed.toCurrency.toUpperCase();

  try {
    const fx = await prisma.fxRate.findUnique({
      where: { baseCurrency_quoteCurrency: { baseCurrency: fromCurrency, quoteCurrency: toCurrency } },
    });

    if (!fx) {
      logAudit({ userId: session.userId, action: 'FX_QUOTE', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason: 'PAIR_NOT_AVAILABLE', fromCurrency, toCurrency } });
      return NextResponse.json({ code: 'PAIR_NOT_AVAILABLE' }, { status: 400 });
    }

    const amount = asDecimal(parsed.amount);
    const fee = amount.mul(new Prisma.Decimal(FEE_BPS)).div(10000);
    const total = amount.add(fee);

    logAudit({
      userId: session.userId,
      action: 'FX_QUOTE',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { fromCurrency, toCurrency, amount: amount.toFixed(2), rate: fx.rate.toFixed(6) },
    });

    return NextResponse.json({
      data: {
        fromCurrency,
        toCurrency,
        amount: amount.toFixed(2),
        rate: fx.rate.toFixed(6),
        fee: fee.toFixed(2),
        total: total.toFixed(2),
      },
    });
  } catch (e: any) {
    logAudit({ userId: session.userId, action: 'FX_QUOTE', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason: e?.message || 'UNKNOWN', fromCurrency, toCurrency } });
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

