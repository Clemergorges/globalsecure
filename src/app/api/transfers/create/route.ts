import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateTransferAmounts } from '@/lib/services/exchange';
import { pusherService } from '@/lib/services/pusher';
import { logAudit } from '@/lib/logger'; // Import logAudit
import { logger } from '@/lib/logger';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';
import { checkUserCanTransact } from '@/lib/services/risk-gates';
import { checkAndCreateAmlCasesForTransfer } from '@/lib/services/aml-rules';
import { getIssuerConnector } from '@/lib/services/issuer-connector';
import { getExchangeRate } from '@/lib/services/exchange';
import { getKycTierLimits } from '@/lib/services/kyc-limits';
import { determineUserRiskTier } from '@/lib/services/risk-profile';
import { z } from 'zod';
import { UserRiskTier } from '@prisma/client';
import { randomBytes } from 'crypto';
import { getJurisdictionRules } from '@/lib/services/jurisdiction-rules';

const transferSchema = z.object({
  mode: z.enum(['ACCOUNT_CONTROLLED', 'CARD_EMAIL', 'SELF_TRANSFER']), // Add other modes if needed
  amountSource: z.number().min(1, "Minimum amount is 1"),
  currencySource: z.string().length(3),
  currencyTarget: z.string().length(3),
  receiverEmail: z.string().email().optional(),
  receiverName: z.string().optional(),
  personalMessage: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  async function sumTransfersEur(senderId: string, since: Date) {
    const transfers = await prisma.transfer.findMany({
      where: { senderId, createdAt: { gte: since } },
      select: { amountSent: true, currencySent: true },
    });

    const currencies = Array.from(new Set(transfers.map((t) => t.currencySent.toUpperCase())));
    const rates = new Map<string, number>();
    for (const c of currencies) {
      if (c === 'EUR') rates.set(c, 1);
      else rates.set(c, await getExchangeRate(c, 'EUR'));
    }

    let total = 0;
    for (const t of transfers) {
      const c = t.currencySent.toUpperCase();
      const rate = rates.get(c) || 1;
      total += Number(t.amountSent) * rate;
    }
    return total;
  }

  try {
    const requestId = req.headers.get('x-request-id') || null;
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const method = req.method;
    const path = new URL(req.url).pathname;
    logger.info({ requestId, userId: (session as any).userId }, 'Transfer create requested');
    const body = await req.json();
    
    // Convert string amount to number for validation
    if (typeof body.amountSource === 'string') {
        body.amountSource = parseFloat(body.amountSource);
    }

    const validation = transferSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation Error', details: validation.error.format() }, { status: 400 });
    }

    const {
      mode,
      amountSource,
      currencySource,
      currencyTarget,
      receiverEmail,
      receiverName,
      personalMessage,
    } = validation.data;
    const receiverEmailEffective =
      mode === 'SELF_TRANSFER'
        ? (receiverEmail || (session as any)?.email || null)
        : (receiverEmail || null);

    if ((mode === 'CARD_EMAIL' || mode === 'ACCOUNT_CONTROLLED') && !receiverEmailEffective) {
      return NextResponse.json({ error: 'Missing receiverEmail', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const senderMessage = personalMessage ? personalMessage.trim() : null;
    if (senderMessage && senderMessage.length > 240) {
      return NextResponse.json({ error: 'Personal message too long', code: 'PERSONAL_MESSAGE_TOO_LONG' }, { status: 400 });
    }

    // 0. KYC Check
    const user = await prisma.user.findUnique({ 
        where: { id: (session as any).userId },
        include: { account: true }
    });

    if (!user || !user.account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const receiverEmailFinal =
      mode === 'SELF_TRANSFER'
        ? (receiverEmailEffective || user.email || 'unknown')
        : (receiverEmailEffective || 'unknown');

    const gate = await checkUserCanTransact(user.id);
    if (!gate.allowed) {
      return NextResponse.json({ error: 'Forbidden', code: gate.code, details: gate.details }, { status: gate.status });
    }

    const jurisdiction = getJurisdictionRules(user.country || null);
    if (!jurisdiction.supported) {
      logAudit({
        userId: user.id,
        action: 'JURISDICTION_BLOCK',
        status: '403',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { country: user.country || null, jurisdiction: jurisdiction.jurisdiction },
      });
      return NextResponse.json({ error: 'Forbidden', code: 'JURISDICTION_NOT_SUPPORTED' }, { status: 403 });
    }

    // SCA CHECK (Strong Customer Authentication)
    // Base threshold: require SCA only when amount in EUR exceeds threshold.
    // In production, default is 30 EUR; in dev, default is higher to ease local tests.
    const highValueThresholdEur = Number(process.env.SENSITIVE_HIGH_VALUE_TRANSFER_THRESHOLD_EUR || 2000);
    const baseScaThresholdEur = Number(
      process.env.SCA_BASE_THRESHOLD_EUR ??
      (process.env.NODE_ENV === 'production' ? 30 : 1000)
    );
    const rateToEur = currencySource.toUpperCase() === 'EUR' ? 1 : await getExchangeRate(currencySource, 'EUR');
    const amountEur = Number(amountSource) * rateToEur;

    if (amountEur > baseScaThresholdEur) {
        // We need to verify if the session has a recent SCA verification
        const sessionId = (session as any).sessionId;
        
        if (sessionId) {
            const dbSession = await prisma.session.findUnique({
                where: { id: sessionId },
                select: { lastScaAt: true }
            });

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            if (!dbSession?.lastScaAt || dbSession.lastScaAt < fiveMinutesAgo) {
                if (amountEur > highValueThresholdEur) {
                  return NextResponse.json({ 
                      error: 'Confirmação por OTP necessária', 
                      code: 'SENSITIVE_OTP_REQUIRED',
                      actionType: 'SENSITIVE_HIGH_VALUE_TRANSFER',
                      message: 'Solicite e confirme o OTP por e-mail para continuar com esta transferência de alto valor.'
                  }, { status: 403 });
                }
                return NextResponse.json({ 
                    error: 'Autenticação Forte (SCA) Necessária', 
                    code: 'SCA_REQUIRED',
                    message: 'Por favor, verifique sua identidade para continuar com esta transferência de valor elevado.'
                }, { status: 403 });
            }
        } else {
            // Fallback for sessions without ID (should enforce re-login)
             return NextResponse.json({ 
                error: 'Sessão inválida para transferência de alto valor. Por favor, faça login novamente.',
                code: 'AUTH_REQUIRED'
            }, { status: 401 });
        }
    }

    const userRiskTier = 'riskTier' in user ? ((user as unknown as { riskTier?: UserRiskTier | null }).riskTier ?? null) : null;
    const riskTier: UserRiskTier = userRiskTier ?? determineUserRiskTier(user);
    const limits = getKycTierLimits(user.kycLevel, riskTier);
    const effectiveCaps = {
      perTxEur: Math.min(limits.effective.perTxEur, jurisdiction.limitsEur.perTxEur),
      dailyEur: Math.min(limits.effective.dailyEur, jurisdiction.limitsEur.dailyEur),
      monthlyEur: Math.min(limits.effective.monthlyEur, jurisdiction.limitsEur.monthlyEur),
    };
    const amountEurForLimits = amountEur;

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyTotalEur = await sumTransfersEur(user.id, dayStart);
    const monthlyTotalEur = await sumTransfersEur(user.id, monthStart);

    if (amountEurForLimits > 10000 && user.kycLevel < 2) {
      await prisma.amlReviewCase.create({
        data: {
          userId: user.id,
          reason: 'TX_OVER_10000_REQUIRES_KYC2',
          contextJson: {
            amountEur: amountEurForLimits,
            amountSource,
            currencySource,
            currencyTarget,
            mode,
          },
          status: 'PENDING',
          riskLevel: 'HIGH',
          riskScore: 85,
        },
      });
      logAudit({
        userId: user.id,
        action: 'KYC2_REQUIRED_BLOCK',
        status: '403',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { amountEur: amountEurForLimits },
      });
      return NextResponse.json({ error: 'Forbidden', code: 'KYC_LEVEL_2_REQUIRED' }, { status: 403 });
    }

    const block = async (limitType: 'TX' | 'DAILY' | 'MONTHLY') => {
      logAudit({
        userId: user.id,
        action: 'KYC_LIMIT_BLOCK',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: {
          limitType,
          kycLevel: user.kycLevel,
          riskTier,
          amount: amountSource,
          currency: currencySource,
          amountEur: amountEurForLimits,
          totals: { dailyEur: dailyTotalEur, monthlyEur: monthlyTotalEur },
          limits: limits.effective,
          effectiveCaps,
          jurisdiction: { id: jurisdiction.jurisdiction, country: user.country || null },
        },
      });

      if (riskTier === 'HIGH' || limitType !== 'TX') {
        await prisma.amlReviewCase.create({
          data: {
            userId: user.id,
            reason: 'KYC_LIMIT_EXCEEDED',
            contextJson: {
              limitType,
              kycLevel: user.kycLevel,
              riskTier,
              amount: amountSource,
              currency: currencySource,
              amountEur: amountEurForLimits,
              totals: { dailyEur: dailyTotalEur, monthlyEur: monthlyTotalEur },
              limits: limits.effective,
            },
            status: 'PENDING',
            riskLevel: riskTier === 'HIGH' ? 'HIGH' : 'MEDIUM',
            riskScore: riskTier === 'HIGH' ? 80 : 50,
            slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        }).catch(() => {});
      }
    };

    if (amountEurForLimits > effectiveCaps.perTxEur) {
      await block('TX');
      return NextResponse.json({ error: 'Forbidden', code: 'KYC_LIMIT_TX_EXCEEDED' }, { status: 403 });
    }
    if (dailyTotalEur + amountEurForLimits > effectiveCaps.dailyEur) {
      await block('DAILY');
      return NextResponse.json({ error: 'Forbidden', code: 'KYC_LIMIT_DAILY_EXCEEDED' }, { status: 403 });
    }
    if (monthlyTotalEur + amountEurForLimits > effectiveCaps.monthlyEur) {
      await block('MONTHLY');
      return NextResponse.json({ error: 'Forbidden', code: 'KYC_LIMIT_MONTHLY_EXCEEDED' }, { status: 403 });
    }

    // 1. Calculate Amounts
    const calculation = await calculateTransferAmounts(
      amountSource,
      currencySource,
      currencyTarget
    );
    
    // GSS-MVP-FIX: Align fee economics with exchange.ts (fee is deducted from amountSource; do not debit fee twice).
    // Total to deduct = amountSource (fee is already represented inside amountReceived calculation)
    const totalDeduction = Number(calculation.totalToPay);

    const cardEmailRecipient =
      mode === 'CARD_EMAIL'
        ? await prisma.user.findUnique({ where: { email: receiverEmailFinal }, include: { account: true } })
        : null;

    if (mode === 'CARD_EMAIL' && cardEmailRecipient && cardEmailRecipient.account) {
      const result = await prisma.$transaction(async (tx) => {
        try {
          await applyFiatMovement(tx, (session as any).userId, currencySource, -totalDeduction);
        } catch (e: any) {
          if (e?.message === 'BALANCE_NOT_FOUND') throw new Error('BALANCE_NOT_FOUND');
          if (e?.message === 'INSUFFICIENT_FUNDS') throw new Error('INSUFFICIENT_FUNDS');
          throw e;
        }

        await applyFiatMovement(tx, cardEmailRecipient.id, currencyTarget, calculation.amountReceived);

        const transfer = await tx.transfer.create({
          data: {
            senderId: (session as any).userId,
            recipientId: cardEmailRecipient.id,
            recipientEmail: receiverEmailFinal,
            recipientName: receiverName || `${cardEmailRecipient.firstName || ''} ${cardEmailRecipient.lastName || ''}`.trim() || null,
            type: 'ACCOUNT',
            amountSent: amountSource,
            currencySent: currencySource,
            amountReceived: calculation.amountReceived,
            currencyReceived: currencyTarget,
            exchangeRate: calculation.rate,
            feePercentage: calculation.feePercentage,
            fee: calculation.fee,
            status: 'COMPLETED',
            completedAt: now,
            logs: {
              create: {
                type: 'CREATE_TRANSFER',
                metadata: { mode, receiverEmail: receiverEmailFinal, receiverName, senderMessage },
              },
            },
          },
        });

        await tx.accountTransaction.create({
          data: {
            accountId: user.account!.id,
            type: 'DEBIT',
            amount: calculation.feeModel === 'EXPLICIT' ? amountSource : totalDeduction,
            currency: currencySource,
            description: `Transfer to ${receiverEmailFinal} (${mode})`,
            transferId: transfer.id,
          },
        });
        if (calculation.feeModel === 'EXPLICIT') {
          await tx.accountTransaction.create({
            data: {
              accountId: user.account!.id,
              type: 'FEE',
              amount: calculation.fee,
              currency: currencySource,
              description: `GSS fee (${mode})`,
              transferId: transfer.id,
            },
          });
        }

        await tx.accountTransaction.create({
          data: {
            accountId: cardEmailRecipient.account!.id,
            type: 'CREDIT',
            amount: calculation.amountReceived,
            currency: currencyTarget,
            description: `Received from ${(session as any).userId}`,
            transferId: transfer.id,
          },
        });

        await tx.userTransaction.create({
          data: {
            userId: (session as any).userId,
            accountId: user.account!.id,
            type: 'TRANSFER',
            amount: amountSource,
            currency: currencySource,
            status: 'COMPLETED',
            metadata: {
              direction: 'OUT',
              recipientEmail: receiverEmailFinal,
              recipientId: cardEmailRecipient.id,
              transferId: transfer.id,
              fee: calculation.fee,
              feeModel: calculation.feeModel,
              amountReceived: calculation.amountReceived,
              currencyReceived: currencyTarget,
              exchangeRate: calculation.rate,
              mode,
            },
          },
        });

        await tx.userTransaction.create({
          data: {
            userId: cardEmailRecipient.id,
            accountId: cardEmailRecipient.account!.id,
            type: 'TRANSFER',
            amount: calculation.amountReceived,
            currency: currencyTarget,
            status: 'COMPLETED',
            metadata: {
              direction: 'IN',
              senderId: (session as any).userId,
              transferId: transfer.id,
              mode,
            },
          },
        });

        if (calculation.feeModel === 'EXPLICIT') {
          await tx.userTransaction.create({
            data: {
              userId: (session as any).userId,
              accountId: user.account!.id,
              type: 'FEE',
              amount: calculation.fee,
              currency: currencySource,
              status: 'COMPLETED',
              metadata: {
                direction: 'OUT',
                transferId: transfer.id,
                feePercentage: calculation.feePercentage,
                mode,
              },
            },
          });
        }

        await tx.transactionLog.create({
          data: {
            transferId: transfer.id,
            type: 'INTERNAL_P2P_CARD_EMAIL',
            metadata: { mode, receiverEmail: receiverEmailFinal },
          },
        });

        return transfer;
      });

      try {
        await Promise.all([
          pusherService.trigger(`user-${(session as any).userId}`, 'transfer:sent', {
            id: result.id,
            amount: amountSource,
            currency: currencySource,
            recipient: receiverEmailFinal,
          }),
          pusherService.trigger(`user-${cardEmailRecipient.id}`, 'transfer:received', {
            id: result.id,
            amount: calculation.amountReceived,
            currency: currencyTarget,
            sender: (session as any).email || null,
          }),
        ]);
      } catch {
      }

      logAudit({
        userId: (session as any).userId,
        action: 'TRANSFER_CREATE',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        method,
        path,
        metadata: { transferId: result.id, mode, amount: amountSource, currencySource, currencyTarget },
      });

      return NextResponse.json({
        success: true,
        transferId: result.id,
        quote: {
          amountSent: calculation.amountSent,
          currencySent: calculation.currencySent,
          fee: calculation.fee,
          feePercentage: calculation.feePercentage,
          totalToPay: totalDeduction,
          rate: calculation.rate,
          amountReceived: calculation.amountReceived,
          currencyReceived: calculation.currencyReceived,
          feeModel: calculation.feeModel,
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      try {
        await applyFiatMovement(tx, (session as any).userId, currencySource, -totalDeduction);
      } catch (e: any) {
        if (e?.message === 'BALANCE_NOT_FOUND') throw new Error('BALANCE_NOT_FOUND');
        if (e?.message === 'INSUFFICIENT_FUNDS') throw new Error('INSUFFICIENT_FUNDS');
        throw e;
      }

      let receiverId: string | null = null;
      let receiverCountry: string | null = null;

      if (mode === 'ACCOUNT_CONTROLLED') {
        const r = await tx.user.findUnique({ where: { email: receiverEmailFinal }, select: { id: true, country: true } });
        receiverId = r?.id || null;
        receiverCountry = r?.country || null;
      }

      if (mode === 'SELF_TRANSFER') {
        receiverId = (session as any).userId;
        receiverCountry = user.country || null;
      }

      const velocityWindowMinutes = Number(process.env.AML_VELOCITY_WINDOW_MINUTES || 10);
      const since = new Date(now.getTime() - (Number.isFinite(velocityWindowMinutes) && velocityWindowMinutes > 0 ? velocityWindowMinutes : 10) * 60 * 1000);
      const velocityCountBefore = await tx.transfer.count({ where: { senderId: (session as any).userId, createdAt: { gte: since } } });

      const transfer = await tx.transfer.create({
        data: {
          senderId: (session as any).userId,
          recipientId: receiverId,
          recipientEmail: receiverEmailFinal,
          recipientName: receiverName,
          type: mode === 'CARD_EMAIL' ? 'CARD' : 'ACCOUNT',
          amountSent: amountSource,
          currencySent: currencySource,
          amountReceived: calculation.amountReceived,
          currencyReceived: currencyTarget,
          exchangeRate: calculation.rate,
          feePercentage: calculation.feePercentage,
          fee: calculation.fee,
          status: 'PENDING',
          logs: {
            create: {
              type: 'CREATE_TRANSFER',
              metadata: { mode, receiverEmail: receiverEmailFinal, receiverName, senderMessage },
            },
          },
        },
      });

      await tx.accountTransaction.create({
        data: {
          accountId: user.account!.id,
          type: 'DEBIT',
          amount: calculation.feeModel === 'EXPLICIT' ? amountSource : totalDeduction,
          currency: currencySource,
          description: `Transfer to ${receiverEmailFinal || 'External'} (${mode})`,
          transferId: transfer.id,
        },
      });
      if (calculation.feeModel === 'EXPLICIT') {
        await tx.accountTransaction.create({
          data: {
            accountId: user.account!.id,
            type: 'FEE',
            amount: calculation.fee,
            currency: currencySource,
            description: `GSS fee (${mode})`,
            transferId: transfer.id,
          },
        });
      }

      await checkAndCreateAmlCasesForTransfer(
        tx,
        (session as any).userId,
        {
          transferId: transfer.id,
          transferType: transfer.type,
          currencySent: currencySource,
          currencyReceived: currencyTarget,
          recipientEmail: receiverEmailFinal || null,
          recipientId: receiverId,
          senderCountry: user.country || null,
          recipientCountry: receiverCountry,
        },
        { now, velocityCountBefore },
      );

      return transfer;
    });

    // 4. If Card Mode, create Virtual Card (OUTSIDE Transaction because it calls External API)
    if (mode === 'CARD_EMAIL') {
      await logAudit({ 
          userId: (session as any).userId, 
          action: 'TRANSFER_CARD_INIT', 
          status: 'PENDING',
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { amount: amountSource, currency: currencySource }
      });

      const supportedCurrencies = ['eur', 'usd', 'gbp'];
      let issueCurrency = currencyTarget.toLowerCase();
      let issueAmount = calculation.amountReceived;

      if (!supportedCurrencies.includes(issueCurrency)) {
        // Log currency conversion attempt
        const { getExchangeRate } = await import('@/lib/services/exchange');
        const exchangeRate = await getExchangeRate(currencyTarget, 'EUR');
        issueAmount = calculation.amountReceived * exchangeRate;
        issueCurrency = 'eur';
      }

      let cardData;
      try {
        const issuer = getIssuerConnector();
        cardData = await issuer.createVirtualCard({
          amount: Number(issueAmount),
          currency: issueCurrency,
          recipientEmail: receiverEmail!,
          recipientName: receiverName!,
          transferId: result.id,
        });
        
        await logAudit({ 
            userId: (session as any).userId, 
            action: 'TRANSFER_CARD_CREATED', 
            status: 'SUCCESS',
            ipAddress,
            userAgent,
            method,
            path,
            metadata: { cardId: cardData.cardId, transferId: result.id, issuer: issuer.kind }
        });
        
        const createdCard = await prisma.virtualCard.create({
            data: {
              transferId: result.id,
              userId: (session as any).userId,
              stripeCardId: cardData.cardId,
              stripeCardholderId: cardData.cardholderId,
              last4: cardData.last4,
              brand: cardData.brand,
              expMonth: cardData.exp_month,
              expYear: cardData.exp_year,
              expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
              amount: calculation.amountReceived,
              currency: currencyTarget,
              status: 'ACTIVE'
            }
        });

        const existingLink = await prisma.claimLink.findUnique({
          where: { virtualCardId: createdCard.id },
          select: { token: true },
        });
        const token = existingLink?.token || randomBytes(32).toString('hex');
        if (!existingLink) {
          await prisma.claimLink.create({
            data: {
              token,
              creatorId: (session as any).userId,
              amount: calculation.amountReceived,
              currency: currencyTarget,
              message: senderMessage,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              virtualCardId: createdCard.id,
            },
          });
        }
        
        // Update Transfer to COMPLETED if card created successfully
        await prisma.transfer.update({ where: { id: result.id }, data: { status: 'COMPLETED' } });

        // Send Email
        try {
            const { sendEmail, templates } = await import('@/lib/services/email');
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const viewCardUrl = `${baseUrl}/card/${token}`;
            await sendEmail({
              to: receiverEmail!,
              subject: 'You received a GlobalSecure virtual card',
              html: templates.cardCreated(
                receiverName || 'Customer',
                cardData.last4,
                Number(issueAmount).toFixed(2),
                issueCurrency.toUpperCase(),
                senderMessage,
                viewCardUrl
              )
            });
        } catch (emailError) {
            console.error('[Transfer] Email sending failed:', emailError);
        }

      } catch (stripeError: any) {
        console.error('[Transfer] Stripe Card Creation Failed:', stripeError);
        
        // ✅ REEMBOLSO AUTOMÁTICO (AUTO-REFUND)
        try {
           console.log('[Transfer] Initiating Auto-Refund for Transfer:', result.id);
           const { sendEmail } = await import('@/lib/services/email');

           await prisma.$transaction(async (tx) => {
             // 1. Creditar o valor de volta ao saldo (Refund)
             await applyFiatMovement(tx, (session as any).userId, currencySource, totalDeduction);
     
             // 2. Atualizar status da transferência
             await tx.transfer.update({ 
               where: { id: result.id }, 
               data: { 
                 status: 'REFUNDED', 
                 canceledAt: new Date()
               } 
             });
     
             // 3. Registrar no audit log
             await tx.auditLog.create({ 
               data: { 
                 action: 'TRANSFER_REFUND', 
                 userId: (session as any).userId, 
                 status: 'SUCCESS',
                 metadata: { 
                   resource: 'TRANSFER',
                   transferId: result.id,
                   reason: 'stripe_card_creation_failed', 
                   originalError: stripeError.message,
                   amountRefunded: totalDeduction, 
                   currency: currencySource 
                 } 
               } 
             });
           });
     
           // Notificar o usuário (Sender)
           if (user.email) {
             try {
                 await sendEmail({ 
                   to: user.email, 
                   subject: 'Reembolso de Transferência - GlobalSecure', 
                   html: `
                      <div style="font-family: sans-serif; padding: 20px;">
                        <h2 style="color: #e11d48;">Transferência não concluída</h2>
                        <p>Olá ${user.firstName},</p>
                        <p>Houve uma falha técnica ao criar o cartão virtual para sua transferência.</p>
                        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 10px 0;">
                            <p style="margin: 0; color: #15803d; font-weight: bold;">✅ O valor de ${currencySource} ${totalDeduction} foi reembolsado integralmente para sua carteira.</p>
                        </div>
                        <p style="color: #666; font-size: 12px;">Erro técnico: ${stripeError.message}</p>
                      </div>
                   `
                 });
             } catch (e) {
                 console.error('Failed to send refund email', e);
             }
           }
     
        } catch (refundError: any) {
           // ⚠️ FALHA CRÍTICA: Reembolso automático falhou
           console.error('[Transfer] CRITICAL: Auto-refund failed:', { 
             transferId: result.id, 
             originalError: stripeError.message, 
             refundError: refundError.message 
           });
           
           // Fallback update
           try {
               await prisma.transfer.update({ 
                 where: { id: result.id }, 
                 data: { status: 'FAILED' } 
               });
           } catch (e) { /* ignore */ }
        }
        
        return NextResponse.json({ 
            error: 'Falha ao processar transferência. O valor foi reembolsado para sua carteira.', 
            code: 'STRIPE_ERROR_REFUNDED' 
        }, { status: 500 });
      }
    }

    // 5. Notify Sender
    try {
      await pusherService.trigger(`user-${(session as any).userId}`, 'transfer-created', { transferId: result.id });
    } catch (pusherError) {
      console.warn('Pusher trigger failed:', pusherError);
    }

    logAudit({
      userId: (session as any).userId,
      action: 'TRANSFER_CREATE',
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { transferId: result.id, mode, amount: amountSource, currencySource, currencyTarget },
    });

    return NextResponse.json({
      success: true,
      transferId: result.id,
      quote: {
        amountSent: calculation.amountSent,
        currencySent: calculation.currencySent,
        fee: calculation.fee,
        feePercentage: calculation.feePercentage,
        totalToPay: totalDeduction,
        rate: calculation.rate,
        amountReceived: calculation.amountReceived,
        currencyReceived: calculation.currencyReceived,
        feeModel: calculation.feeModel,
      },
    });
  } catch (error: any) {
    const requestId = req.headers.get('x-request-id') || null;
    console.error('Transfer creation failed:', error);
    logger.error({ requestId, userId: (session as any)?.userId, err: error }, 'Transfer create failed');
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const method = req.method;
    const path = new URL(req.url).pathname;
    logAudit({
      userId: (session as any)?.userId,
      action: 'TRANSFER_CREATE',
      status: 'FAILURE',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { reason: error?.message || 'UNKNOWN' },
    });
    if (error?.message === 'BALANCE_NOT_FOUND') {
      return NextResponse.json({ error: 'Balance not found' }, { status: 400 });
    }
    if (error?.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Transfer creation failed', details: error.message }, { status: 500 });
  }
}
