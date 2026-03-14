import { NextRequest, NextResponse } from 'next/server';
import { Prisma, UserRole } from '@prisma/client';
import { validateSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';
import { calculateTransferAmounts } from '@/lib/services/exchange';
import { decideAndPersistRoute } from '@/lib/services/routing-engine';
import { z } from 'zod';
import crypto from 'crypto';

function isDemoEnabled() {
  if (process.env.DEMO_MODE_ENABLED === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

const schema = z.object({
  corridor: z.enum(['EU_BR_FIAT', 'BR_EU_FIAT', 'EU_BR_CRYPTO', 'BR_EU_CRYPTO', 'EU_EU', 'BR_BR']),
  amount: z.union([z.number(), z.string()]).optional(),
});

function parseAmount(raw: unknown) {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw);
  return NaN;
}

function corridorDefaults(corridor: z.infer<typeof schema>['corridor']) {
  switch (corridor) {
    case 'EU_BR_FIAT':
      return { originCountry: 'LU', destinationCountry: 'BR', currencySource: 'EUR', currencyTarget: 'BRL', railHint: 'FIAT_STUB' as const };
    case 'BR_EU_FIAT':
      return { originCountry: 'BR', destinationCountry: 'LU', currencySource: 'BRL', currencyTarget: 'EUR', railHint: 'FIAT_STUB' as const };
    case 'EU_BR_CRYPTO':
      return { originCountry: 'LU', destinationCountry: 'BR', currencySource: 'EUR', currencyTarget: 'BRL', railHint: 'CRYPTO_POLYGON' as const };
    case 'BR_EU_CRYPTO':
      return { originCountry: 'BR', destinationCountry: 'LU', currencySource: 'BRL', currencyTarget: 'EUR', railHint: 'CRYPTO_POLYGON' as const };
    case 'EU_EU':
      return { originCountry: 'LU', destinationCountry: 'DE', currencySource: 'EUR', currencyTarget: 'EUR', railHint: 'LEDGER_INTERNAL' as const };
    case 'BR_BR':
      return { originCountry: 'BR', destinationCountry: 'BR', currencySource: 'BRL', currencyTarget: 'BRL', railHint: 'LEDGER_INTERNAL' as const };
  }
}

async function ensureDemoUser(params: { country: string; currency: string; kind: 'EU' | 'BR' }) {
  const email = `demo.recipient.${params.kind.toLowerCase()}@gss.dev`;
  const existing = await prisma.user.findUnique({ where: { email }, include: { account: true } });
  if (existing?.account) return { user: existing, accountId: existing.account.id };

  const passwordHash = `DEMO:${crypto.randomBytes(20).toString('hex')}`;
  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: { country: params.country, emailVerified: true, passwordHash, role: UserRole.END_USER },
        include: { account: true },
      })
    : await prisma.user.create({
        data: {
          email,
          emailVerified: true,
          passwordHash,
          role: UserRole.END_USER,
          country: params.country,
          firstName: params.kind === 'EU' ? 'Demo' : 'Demo',
          lastName: params.kind === 'EU' ? 'EU' : 'BR',
        },
        include: { account: true },
      });

  if (user.account) return { user, accountId: user.account.id };

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      status: 'ACTIVE',
      primaryCurrency: params.currency.toUpperCase(),
    },
    select: { id: true },
  });

  return { user, accountId: account.id };
}

export async function POST(req: NextRequest) {
  if (!isDemoEnabled()) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  const session = await validateSession(req);
  if (!session) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role !== UserRole.END_USER) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const defaults = corridorDefaults(parsed.corridor);
  const amount = parseAmount(parsed.amount) || (defaults.currencySource === 'EUR' ? 1000 : 5000);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ code: 'INVALID_AMOUNT' }, { status: 400 });

  const sender = await prisma.user.findUnique({ where: { id: session.userId }, include: { account: true } });
  if (!sender) return NextResponse.json({ code: 'USER_NOT_FOUND' }, { status: 404 });
  if (!sender.account) {
    await prisma.account.create({ data: { userId: sender.id, status: 'ACTIVE', primaryCurrency: defaults.currencySource } });
  }

  const recipient = await ensureDemoUser({
    country: defaults.destinationCountry,
    currency: defaults.currencyTarget,
    kind: defaults.destinationCountry === 'BR' ? 'BR' : 'EU',
  });

  const now = new Date();
  const amountSource = new Prisma.Decimal(amount).toDecimalPlaces(2);
  const quote = await calculateTransferAmounts(amount, defaults.currencySource, defaults.currencyTarget);
  const totalToPay = new Prisma.Decimal(quote.totalToPay).toDecimalPlaces(2);

  const result = await prisma.$transaction(async (tx) => {
    const senderAccount = await tx.account.findUniqueOrThrow({ where: { userId: sender.id } });

    await applyFiatMovement(tx, sender.id, defaults.currencySource, amountSource);
    await tx.accountTransaction.create({
      data: {
        accountId: senderAccount.id,
        type: 'DEPOSIT',
        amount: amountSource,
        currency: defaults.currencySource,
        description: `Demo deposit (${defaults.originCountry})`,
      },
    });

    await applyFiatMovement(tx, sender.id, defaults.currencySource, totalToPay.mul(-1));
    await applyFiatMovement(tx, recipient.user.id, defaults.currencyTarget, new Prisma.Decimal(quote.amountReceived));

    const transfer = await tx.transfer.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.user.id,
        recipientEmail: recipient.user.email,
        recipientName: `${recipient.user.firstName || ''} ${recipient.user.lastName || ''}`.trim() || null,
        type: 'ACCOUNT',
        amountSent: amountSource,
        currencySent: defaults.currencySource,
        amountReceived: new Prisma.Decimal(quote.amountReceived),
        currencyReceived: defaults.currencyTarget,
        exchangeRate: new Prisma.Decimal(quote.rate),
        feePercentage: new Prisma.Decimal(quote.feePercentage),
        fee: new Prisma.Decimal(quote.fee),
        status: 'COMPLETED',
        completedAt: now,
        logs: {
          create: { type: 'DEMO_SIMULATION', metadata: { corridor: parsed.corridor, originCountry: defaults.originCountry, destinationCountry: defaults.destinationCountry, railHint: defaults.railHint } },
        },
      },
      select: { id: true },
    });

    await tx.accountTransaction.create({
      data: {
        accountId: senderAccount.id,
        type: 'DEBIT',
        amount: amountSource,
        currency: defaults.currencySource,
        description: `Demo transfer (${parsed.corridor})`,
        transferId: transfer.id,
      },
    });
    await tx.accountTransaction.create({
      data: {
        accountId: senderAccount.id,
        type: 'FEE',
        amount: new Prisma.Decimal(quote.fee),
        currency: defaults.currencySource,
        description: `Demo fee (${parsed.corridor})`,
        transferId: transfer.id,
      },
    });
    await tx.accountTransaction.create({
      data: {
        accountId: recipient.accountId,
        type: 'CREDIT',
        amount: new Prisma.Decimal(quote.amountReceived),
        currency: defaults.currencyTarget,
        description: `Demo receive (${parsed.corridor})`,
        transferId: transfer.id,
      },
    });

    await tx.userTransaction.create({
      data: {
        userId: sender.id,
        accountId: senderAccount.id,
        type: 'TRANSFER',
        amount: amountSource,
        currency: defaults.currencySource,
        status: 'COMPLETED',
        metadata: {
          direction: 'OUT',
          recipientEmail: recipient.user.email,
          recipientId: recipient.user.id,
          transferId: transfer.id,
          fee: quote.fee,
          feeModel: quote.feeModel,
          amountReceived: quote.amountReceived,
          currencyReceived: defaults.currencyTarget,
          exchangeRate: quote.rate,
          mode: 'DEMO',
        },
      },
    });

    await tx.userTransaction.create({
      data: {
        userId: recipient.user.id,
        accountId: recipient.accountId,
        type: 'TRANSFER',
        amount: new Prisma.Decimal(quote.amountReceived),
        currency: defaults.currencyTarget,
        status: 'COMPLETED',
        metadata: { direction: 'IN', senderId: sender.id, transferId: transfer.id, mode: 'DEMO' },
      },
    });

    return { transferId: transfer.id };
  });

  const decision = await decideAndPersistRoute({
    userId: sender.id,
    transferId: result.transferId,
    originCountry: defaults.originCountry,
    destinationCountry: defaults.destinationCountry,
    amount: amountSource,
    currencySource: defaults.currencySource,
    currencyTarget: defaults.currencyTarget,
  });

  return NextResponse.json({ transferId: result.transferId, routingDecisionId: decision.id });
}

