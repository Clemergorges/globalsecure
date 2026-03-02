import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TransactionStatus, TransactionType, UserRole } from '@prisma/client';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';
import { z } from 'zod';

const schema = z.object({
  fromCurrency: z.string().min(1).max(10),
  toCurrency: z.string().min(1).max(10),
  amount: z.string().min(1).max(50),
  clientQuoteId: z.string().max(200).optional(),
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
    logAudit({ userId: session.userId, action: 'FX_CONVERT', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason: 'VALIDATION' } });
    return NextResponse.json({ code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const fromCurrency = parsed.fromCurrency.toUpperCase();
  const toCurrency = parsed.toCurrency.toUpperCase();
  const amount = asDecimal(parsed.amount);
  const fee = amount.mul(new Prisma.Decimal(FEE_BPS)).div(10000);
  const debitTotal = amount.add(fee);

  try {
    const fx = await prisma.fxRate.findUnique({
      where: { baseCurrency_quoteCurrency: { baseCurrency: fromCurrency, quoteCurrency: toCurrency } },
    });

    if (!fx) {
      logAudit({ userId: session.userId, action: 'FX_CONVERT', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason: 'PAIR_NOT_AVAILABLE', fromCurrency, toCurrency } });
      return NextResponse.json({ code: 'PAIR_NOT_AVAILABLE' }, { status: 400 });
    }

    const credited = amount.mul(fx.rate);

    const account = await prisma.account.findUnique({ where: { userId: session.userId }, select: { id: true, primaryCurrency: true } });
    if (!account) {
      logAudit({ userId: session.userId, action: 'FX_CONVERT', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason: 'ACCOUNT_NOT_FOUND' } });
      return NextResponse.json({ code: 'ACCOUNT_NOT_FOUND' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      try {
        await applyFiatMovement(tx, session.userId, fromCurrency, debitTotal.mul(-1));
      } catch (e: any) {
        if (e?.message === 'BALANCE_NOT_FOUND') throw new Error('BALANCE_NOT_FOUND');
        if (e?.message === 'INSUFFICIENT_FUNDS') throw new Error('INSUFFICIENT_FUNDS');
        throw e;
      }

      await applyFiatMovement(tx, session.userId, toCurrency, credited);

      const txRow = await tx.userTransaction.create({
        data: {
          userId: session.userId,
          accountId: account.id,
          type: TransactionType.FX,
          amount: amount,
          currency: fromCurrency,
          status: TransactionStatus.COMPLETED,
          metadata: {
            fromCurrency,
            toCurrency,
            amountIn: amount.toFixed(2),
            fee: fee.toFixed(2),
            debitTotal: debitTotal.toFixed(2),
            rate: fx.rate.toFixed(6),
            spreadBps: fx.spreadBps,
            amountOut: credited.toFixed(6),
            clientQuoteId: parsed.clientQuoteId || null,
          },
        },
      });

      const fromBal = await tx.fiatBalance.findUnique({ where: { userId_currency: { userId: session.userId, currency: fromCurrency } } });
      const toBal = await tx.fiatBalance.findUnique({ where: { userId_currency: { userId: session.userId, currency: toCurrency } } });

      return { txRow, fromBal, toBal };
    });

    logAudit({
      userId: session.userId,
      action: 'FX_CONVERT',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { fromCurrency, toCurrency, amount: amount.toFixed(2), fee: fee.toFixed(2), rate: fx.rate.toFixed(6) },
    });

    return NextResponse.json({
      data: {
        fromCurrency,
        toCurrency,
        amount: amount.toFixed(2),
        rate: fx.rate.toFixed(6),
        fee: fee.toFixed(2),
        debitTotal: debitTotal.toFixed(2),
        credited: credited.toFixed(6),
        balances: {
          from: result.fromBal ? result.fromBal.amount.toFixed(2) : null,
          to: result.toBal ? result.toBal.amount.toFixed(2) : null,
        },
        transactionId: result.txRow.id,
      },
    });
  } catch (e: any) {
    const reason = e?.message || 'UNKNOWN';
    if (reason === 'INSUFFICIENT_FUNDS') {
      logAudit({ userId: session.userId, action: 'FX_CONVERT', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason, fromCurrency, toCurrency, amount: amount.toFixed(2) } });
      return NextResponse.json({ code: 'INSUFFICIENT_FUNDS' }, { status: 400 });
    }
    if (reason === 'BALANCE_NOT_FOUND') {
      logAudit({ userId: session.userId, action: 'FX_CONVERT', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason, fromCurrency, toCurrency } });
      return NextResponse.json({ code: 'BALANCE_NOT_FOUND' }, { status: 400 });
    }

    logAudit({ userId: session.userId, action: 'FX_CONVERT', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason, fromCurrency, toCurrency } });
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

