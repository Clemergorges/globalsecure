import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';
import { applyFiatMovement, isYieldSpendingEnabled, recordUserConsent } from '@/lib/services/fiat-ledger';
import { getFxRate } from '@/lib/services/fx-engine';
import { checkAmlForYieldSpend } from '@/lib/services/aml-rules';
import { coverFiatSpend } from '@/lib/services/fiat-pool';

function getMinorUnitDivisor(currency: string) {
  const c = currency.toUpperCase();
  if (c === 'JPY' || c === 'KRW') return 1;
  return 100;
}

function getYieldLtvMax() {
  const raw = process.env.YIELD_LTV_MAX_BPS;
  const n = raw ? Number(raw) : 3500;
  const bps = Number.isFinite(n) && n >= 0 ? Math.round(n) : 3500;
  return Math.min(Math.max(bps / 10000, 0), 1);
}

function getYieldCollateralStubUsd() {
  const raw = process.env.YIELD_COLLATERAL_VALUE_USD_STUB;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function getYieldPerUserLimitUsd() {
  const raw = process.env.YIELD_PER_USER_LIMIT_USD;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test' // Fallback for dev/test
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Top-up logic
      // Metadata should contain userId
      const userId = session.metadata?.userId;
      const amount = session.amount_total ? session.amount_total / 100 : 0; // Convert cents to major unit
      const currency = session.currency?.toUpperCase() || 'EUR';

      if (userId && amount > 0) {
        await prisma.$transaction(async (tx) => {
          // Idempotency check
          const existing = await tx.topUp.findUnique({
            where: { stripeSessionId: session.id }
          });

          if (!existing) {
            await tx.topUp.create({
              data: {
                userId,
                amount,
                currency,
                stripeSessionId: session.id,
                status: 'COMPLETED'
              }
            });

            const account = await tx.account.findUniqueOrThrow({ where: { userId } });
            await applyFiatMovement(tx, userId, currency, amount);

            // Log Transaction
            await tx.accountTransaction.create({
              data: {
                accountId: account.id,
                type: 'DEPOSIT',
                amount,
                currency,
                description: `Top-up via Stripe (${session.payment_status})`
              }
            });
          }
        });
        console.log(`Top-up processed for user ${userId}: ${amount} ${currency}`);
      }
    }

    if (event.type === 'issuing_authorization.request') {
      const auth = event.data.object as Stripe.Issuing.Authorization;
      const cardId = auth.card.id;
      const spendCurrency = (auth.currency || '').toUpperCase();
      const amountMinor = typeof auth.amount === 'number' ? auth.amount : Number(auth.amount || 0);
      const spendAmount = amountMinor / getMinorUnitDivisor(spendCurrency);
      
      const virtualCard = await prisma.virtualCard.findUnique({
          where: { stripeCardId: cardId },
          include: { transfer: true } // to get sender details for notification
      });

      if (!virtualCard) {
          console.warn(`Card not found for authorization: ${cardId}`);
          return NextResponse.json({ approved: false, metadata: { reason: 'card_not_found' } });
      }

      if (virtualCard.unlockCode && !virtualCard.unlockedAt) {
          console.log(`Blocking transaction for LOCKED card ${virtualCard.id}`);
          
          // Trigger Notification (Mock for now, or use Notification service if available)
          // We can insert into Notification table
          if (virtualCard.transfer?.senderId) {
             await prisma.notification.create({
                 data: {
                     userId: virtualCard.transfer.senderId,
                     title: 'Tentativa de uso do cartão',
                     body: `O cartão ${virtualCard.last4} foi recusado porque está BLOQUEADO. Toque para liberar.`,
                     type: 'ACTION_REQUIRED' // Custom type for actionable notifications
                 }
             });
          }

          return NextResponse.json({ 
              approved: false, 
              metadata: { 
                  reason: 'card_locked',
                  custom_message: 'Card is locked. Ask sender to unlock.' 
              } 
          });
      }

      // If UNLOCKED, we approve. 
      // Note: In a real Issuing flow, we might also want to deduct balance here or check funds.
      // But user said "dá para fazer 100% em cima da segurança que já existe", implying relying on Stripe's balance or pre-loaded amount.
      // Since VirtualCard has 'amount', we should probably check it?
      // But Stripe Issuing cards usually have limits set on Stripe side.
      // We'll just approve for now to satisfy the "Unlock" flow requirement.
      
      const existing = await prisma.spendTransaction.findUnique({
        where: { stripeAuthId: auth.id },
        select: { id: true, status: true },
      });

      if (existing) {
        return NextResponse.json({ approved: existing.status === 'approved' });
      }

      const cardCurrency = virtualCard.currency.toUpperCase();
      let amountInCardCurrency = spendAmount;
      let fxMeta: any = null;

      if (spendCurrency && spendCurrency !== cardCurrency) {
        const fx = await getFxRate(spendCurrency, cardCurrency);
        const rateConservative = fx.rateMid * (1 + fx.spreadBps / 10000);
        amountInCardCurrency = spendAmount * rateConservative;
        fxMeta = {
          from: spendCurrency,
          to: cardCurrency,
          rateMid: fx.rateMid,
          rateApplied: rateConservative,
          spreadBps: fx.spreadBps,
        };
      }

      const approved = await prisma.$transaction(async (tx) => {
        const refreshed = await tx.virtualCard.findUnique({
          where: { id: virtualCard.id },
          select: { id: true, amount: true, amountUsed: true, currency: true, userId: true },
        });

        if (!refreshed) return false;

        const available = refreshed.amount.toNumber() - refreshed.amountUsed.toNumber();
        if (available < amountInCardCurrency) {
          await tx.spendTransaction.create({
            data: {
              cardId: refreshed.id,
              stripeAuthId: auth.id,
              amount: amountInCardCurrency,
              currency: cardCurrency,
              merchantName: auth.merchant_data?.name || null,
              merchantCategory: auth.merchant_data?.category || null,
              merchantCity: auth.merchant_data?.city || null,
              merchantCountry: auth.merchant_data?.country || null,
              status: 'declined',
              metadata: fxMeta ? { fx: fxMeta, spend: { currency: spendCurrency, amount: spendAmount } } : { spend: { currency: spendCurrency, amount: spendAmount } },
            },
          });
          return false;
        }

        await tx.virtualCard.update({
          where: { id: refreshed.id },
          data: { amountUsed: { increment: amountInCardCurrency } },
        });

        if (refreshed.userId) {
          const baseCurrency = (process.env.BASE_CURRENCY || 'USD').toUpperCase();
          const covered = await coverFiatSpend(tx, refreshed.userId, spendCurrency, spendAmount, baseCurrency);
          const remaining = covered.remaining;
          const usedFxSteps = covered.fxSteps;

          if (usedFxSteps.length > 0) {
            fxMeta = { ...(fxMeta || {}), pool: usedFxSteps.length === 1 ? usedFxSteps[0] : usedFxSteps };
          }

          if (remaining > 0) {
              const user = await tx.user.findUnique({
                where: { id: refreshed.userId },
                select: { yieldEnabled: true },
              });

              if (!user?.yieldEnabled || !isYieldSpendingEnabled()) {
                await tx.spendTransaction.create({
                  data: {
                    cardId: refreshed.id,
                    stripeAuthId: auth.id,
                    amount: amountInCardCurrency,
                    currency: cardCurrency,
                    merchantName: auth.merchant_data?.name || null,
                    merchantCategory: auth.merchant_data?.category || null,
                    merchantCity: auth.merchant_data?.city || null,
                    merchantCountry: auth.merchant_data?.country || null,
                    status: 'declined',
                    metadata: {
                      spend: { currency: spendCurrency, amount: spendAmount },
                      fx: fxMeta,
                      declineReason: 'INSUFFICIENT_FIAT',
                    },
                  },
                });
                return false;
              }

              let missingUsd = remaining;
              let missingFxMeta: any = null;
              if (spendCurrency !== 'USD') {
                const fxUsd = await getFxRate('USD', spendCurrency);
                const usdNeeded = remaining / fxUsd.rateApplied;
                missingUsd = usdNeeded;
                missingFxMeta = {
                  from: 'USD',
                  to: spendCurrency,
                  rateMid: fxUsd.rateMid,
                  rateApplied: fxUsd.rateApplied,
                  spreadBps: fxUsd.spreadBps,
                };
              }

              const perUserLimit = getYieldPerUserLimitUsd();
              if (perUserLimit > 0 && missingUsd > perUserLimit) {
                await tx.spendTransaction.create({
                  data: {
                    cardId: refreshed.id,
                    stripeAuthId: auth.id,
                    amount: amountInCardCurrency,
                    currency: cardCurrency,
                    merchantName: auth.merchant_data?.name || null,
                    merchantCategory: auth.merchant_data?.category || null,
                    merchantCity: auth.merchant_data?.city || null,
                    merchantCountry: auth.merchant_data?.country || null,
                    status: 'declined',
                    metadata: {
                      spend: { currency: spendCurrency, amount: spendAmount },
                      fx: fxMeta,
                      declineReason: 'YIELD_PER_USER_LIMIT',
                      yield: { missingUsd },
                    },
                  },
                });
                return false;
              }

              const aml = await checkAmlForYieldSpend(refreshed.userId, {
                amountUsd: missingUsd,
                merchantCountry: auth.merchant_data?.country || null,
                merchantCategory: auth.merchant_data?.category || null,
                currency: spendCurrency,
              });

              if (!aml.allowed) {
                await tx.amlReviewCase.create({
                  data: {
                    userId: refreshed.userId,
                    reason: aml.reason,
                    contextJson: {
                      amountUsd: missingUsd,
                      spend: { currency: spendCurrency, amount: spendAmount },
                      merchant: auth.merchant_data
                        ? {
                            name: auth.merchant_data.name || null,
                            category: auth.merchant_data.category || null,
                            city: auth.merchant_data.city || null,
                            country: auth.merchant_data.country || null,
                          }
                        : null,
                      authId: auth.id,
                    },
                  },
                });

                await recordUserConsent(tx, refreshed.userId, 'YIELD_AML_BLOCK', {
                  reason: aml.reason,
                  amountUsd: missingUsd,
                  authId: auth.id,
                  spendCurrency,
                  spendAmount,
                });

                await tx.spendTransaction.create({
                  data: {
                    cardId: refreshed.id,
                    stripeAuthId: auth.id,
                    amount: amountInCardCurrency,
                    currency: cardCurrency,
                    merchantName: auth.merchant_data?.name || null,
                    merchantCategory: auth.merchant_data?.category || null,
                    merchantCity: auth.merchant_data?.city || null,
                    merchantCountry: auth.merchant_data?.country || null,
                    status: 'declined',
                    metadata: {
                      spend: { currency: spendCurrency, amount: spendAmount },
                      fx: fxMeta,
                      declineReason: 'AML_PENDING',
                      yield: { missingUsd, missingFx: missingFxMeta, amlReason: aml.reason },
                    },
                  },
                });
                return false;
              }

              const ltvMax = getYieldLtvMax();
              const creditLine = await tx.userCreditLine.upsert({
                where: { userId: refreshed.userId },
                update: { ltvMax },
                create: {
                  userId: refreshed.userId,
                  collateralAsset: 'EETH',
                  collateralAmount: 0,
                  collateralValueUsd: 0,
                  ltvMax,
                  ltvCurrent: 0,
                  status: 'INACTIVE',
                },
              });

              const collateralValueUsd = creditLine.collateralValueUsd.toNumber() || getYieldCollateralStubUsd();
              const debtAgg = await tx.yieldLiability.aggregate({
                where: { userId: refreshed.userId, status: { in: ['PENDING_SETTLEMENT', 'SETTLED_READY'] } },
                _sum: { amountUsd: true },
              });
              const debtUsd = debtAgg._sum.amountUsd?.toNumber() || 0;
              const powerUsd = collateralValueUsd * ltvMax;
              const availableUsd = Math.max(powerUsd - debtUsd, 0);

              if (availableUsd < missingUsd) {
                await tx.spendTransaction.create({
                  data: {
                    cardId: refreshed.id,
                    stripeAuthId: auth.id,
                    amount: amountInCardCurrency,
                    currency: cardCurrency,
                    merchantName: auth.merchant_data?.name || null,
                    merchantCategory: auth.merchant_data?.category || null,
                    merchantCity: auth.merchant_data?.city || null,
                    merchantCountry: auth.merchant_data?.country || null,
                    status: 'declined',
                    metadata: {
                      spend: { currency: spendCurrency, amount: spendAmount },
                      fx: fxMeta,
                      declineReason: 'YIELD_LIMIT',
                      yield: { missingUsd, collateralValueUsd, powerUsd, availableUsd, debtUsd, ltvMax },
                    },
                  },
                });
                return false;
              }

              const liability = await tx.yieldLiability.create({
                data: {
                  userId: refreshed.userId,
                  amountUsd: missingUsd,
                  status: 'PENDING_SETTLEMENT',
                  authId: auth.id,
                },
                select: { id: true },
              });

              const ltvCurrent = collateralValueUsd > 0 ? (debtUsd + missingUsd) / collateralValueUsd : 0;
              await tx.userCreditLine.update({
                where: { id: creditLine.id },
                data: { ltvCurrent },
              });

              fxMeta = {
                ...(fxMeta || {}),
                yield: {
                  amountUsd: missingUsd,
                  liabilityId: liability.id,
                  missingFx: missingFxMeta,
                },
              };

              return true;
          }
        }

        await tx.spendTransaction.create({
          data: {
            cardId: refreshed.id,
            stripeAuthId: auth.id,
            amount: amountInCardCurrency,
            currency: cardCurrency,
            merchantName: auth.merchant_data?.name || null,
            merchantCategory: auth.merchant_data?.category || null,
            merchantCity: auth.merchant_data?.city || null,
            merchantCountry: auth.merchant_data?.country || null,
            status: 'approved',
            metadata: fxMeta ? { fx: fxMeta, spend: { currency: spendCurrency, amount: spendAmount } } : { spend: { currency: spendCurrency, amount: spendAmount } },
          },
        });

        return true;
      });

      return NextResponse.json({ approved });
    }
    
    // Handle other events...

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error(`Webhook handler error: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
  }
}
