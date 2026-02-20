import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB'
]);

export async function GET() {
  const session = await getSession();
  if (!session || typeof session === 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: (session as any).userId } });
  const country = user?.country || 'LU';
  const isEU = EU_COUNTRIES.has(country);

  if (!isEU) {
    return NextResponse.json({ error: 'SEPA disponível apenas para contas UE' }, { status: 400 });
  }

  const bankInfo = {
    accountName: process.env.SEPA_ACCOUNT_NAME || 'GlobalSecureSend EU',
    iban: process.env.SEPA_IBAN || 'LU00 1234 5678 9012 3456',
    bic: process.env.SEPA_BIC || 'BICLULULL',
    reference: `GSS-${(session as any).userId.substring(0,8)}`,
    instantFeeEUR: Number(process.env.SEPA_INSTANT_FEE_EUR || '0')
  };

  return NextResponse.json(bankInfo);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { amount, instant } = await req.json();
    const userId = (session as any).userId as string;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const country = user?.country || 'LU';
    const isEU = EU_COUNTRIES.has(country);
    if (!isEU) {
      return NextResponse.json({ error: 'SEPA disponível apenas para contas UE' }, { status: 400 });
    }

    const account = await prisma.account.findUnique({ where: { userId } });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const feeInstant = instant ? Number(process.env.SEPA_INSTANT_FEE_EUR || '0') : 0;
    const creditAmount = Number(amount);
    const currency = 'EUR';

    await prisma.$transaction(async (tx) => {
      await applyFiatMovement(tx, userId, currency, creditAmount);

      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: 'DEPOSIT',
          amount: creditAmount,
          currency,
          description: instant ? 'SEPA Instant' : 'Bank Transfer (SEPA)'
        }
      });

      if (feeInstant && feeInstant > 0) {
        await applyFiatMovement(tx, userId, currency, -feeInstant);
        await tx.accountTransaction.create({
          data: {
            accountId: account.id,
            type: 'FEE',
            amount: feeInstant,
            currency,
            description: 'Instant Processing'
          }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to process SEPA deposit' }, { status: 500 });
  }
}
