import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createVirtualCard } from '@/lib/services/stripe';
import { calculateTransferAmounts } from '@/lib/services/exchange';
import { pusherService } from '@/lib/services/pusher';
import { logAudit } from '@/lib/logger'; // Import logAudit
import { applyFiatMovement } from '@/lib/services/fiat-ledger';
import { checkUserCanTransact } from '@/lib/services/risk-gates';
import { checkAndCreateAmlCasesForTransfer } from '@/lib/services/aml-rules';
import { z } from 'zod';

const transferSchema = z.object({
  mode: z.enum(['ACCOUNT_CONTROLLED', 'CARD_EMAIL', 'SELF_TRANSFER']), // Add other modes if needed
  amountSource: z.number().min(1, "Minimum amount is 1"),
  currencySource: z.string().length(3),
  currencyTarget: z.string().length(3),
  receiverEmail: z.string().email().optional(),
  receiverName: z.string().optional()
});

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
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
      receiverName
    } = validation.data;

    // 0. KYC Check
    const user = await prisma.user.findUnique({ 
        where: { id: (session as any).userId },
        include: { account: true }
    });

    if (!user || !user.account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const gate = await checkUserCanTransact(user.id);
    if (!gate.allowed) {
      return NextResponse.json({ error: 'Forbidden', code: gate.code, details: gate.details }, { status: gate.status });
    }

    // SCA CHECK (Strong Customer Authentication)
    // Required for amounts > 30 EUR (approx)
    if (amountSource > 30) {
        // We need to verify if the session has a recent SCA verification
        const sessionId = (session as any).sessionId;
        
        if (sessionId) {
            const dbSession = await prisma.session.findUnique({
                where: { id: sessionId },
                select: { lastScaAt: true }
            });

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            if (!dbSession?.lastScaAt || dbSession.lastScaAt < fiveMinutesAgo) {
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

    // Limits based on KYC Level
    const amount = amountSource;
    const kycLevel = user.kycLevel;

    if (kycLevel === 0 && amount > 100) {
      return NextResponse.json({ error: 'Unverified account limit exceeded. Please complete KYC to send more than €100.' }, { status: 403 });
    }
    if (kycLevel === 1 && amount > 500) {
      return NextResponse.json({ error: 'Pending verification limit exceeded. Please wait for approval to send more than €500.' }, { status: 403 });
    }

    // 1. Calculate Amounts
    const calculation = await calculateTransferAmounts(
      amountSource,
      currencySource,
      currencyTarget
    );
    
    // Total to deduct = Amount + Fee
    const totalDeduction = Number(amountSource) + Number(calculation.fee);

    // 2. Transaction: Debit & Create Transfer
    const result = await prisma.$transaction(async (tx) => {
        try {
          await applyFiatMovement(tx, (session as any).userId, currencySource, -totalDeduction);
        } catch (e: any) {
          if (e?.message === 'BALANCE_NOT_FOUND') throw new Error('BALANCE_NOT_FOUND');
          if (e?.message === 'INSUFFICIENT_FUNDS') throw new Error('INSUFFICIENT_FUNDS');
          throw e;
        }

        // Log Debit Transaction
        await tx.accountTransaction.create({
            data: {
                accountId: user.account!.id,
                type: 'DEBIT',
                amount: totalDeduction,
                currency: currencySource,
                description: `Transfer to ${receiverEmail || 'External'} (${mode})`
            }
        });

        // 2.2 Find Receiver if Account mode
        let receiverId = null;
        let receiverCountry: string | null = null;
        if (mode === 'ACCOUNT_CONTROLLED' && receiverEmail) {
            const receiver = await tx.user.findUnique({ where: { email: receiverEmail }, select: { id: true, country: true } });
            if (receiver) {
              receiverId = receiver.id;
              receiverCountry = receiver.country || null;
            }
        }

        const now = new Date();
        const velocityWindowMinutes = Number(process.env.AML_VELOCITY_WINDOW_MINUTES || 10);
        const since = new Date(now.getTime() - (Number.isFinite(velocityWindowMinutes) && velocityWindowMinutes > 0 ? velocityWindowMinutes : 10) * 60 * 1000);
        const velocityCountBefore = await tx.transfer.count({ where: { senderId: (session as any).userId, createdAt: { gte: since } } });

        // 2.3 Create Transfer Record
        const transfer = await tx.transfer.create({
            data: {
                senderId: (session as any).userId,
                recipientId: receiverId,
                recipientEmail: receiverEmail || 'unknown',
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
                        metadata: { receiverEmail, receiverName }
                    }
                }
            }
        });

        await checkAndCreateAmlCasesForTransfer(
          tx,
          (session as any).userId,
          {
            transferId: transfer.id,
            transferType: transfer.type,
            currencySent: currencySource,
            currencyReceived: currencyTarget,
            recipientEmail: receiverEmail || null,
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
        cardData = await createVirtualCard({
          amount: Number(issueAmount),
          currency: issueCurrency,
          recipientEmail: receiverEmail!,
          recipientName: receiverName!,
          transferId: result.id
        });
        
        await logAudit({ 
            userId: (session as any).userId, 
            action: 'TRANSFER_CARD_CREATED', 
            status: 'SUCCESS',
            metadata: { cardId: cardData.cardId, transferId: result.id }
        });
        
        await prisma.virtualCard.create({
            data: {
              transferId: result.id,
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
        
        // Update Transfer to COMPLETED if card created successfully
        await prisma.transfer.update({ where: { id: result.id }, data: { status: 'COMPLETED' } });

        // Send Email
        try {
            const { sendEmail, templates } = await import('@/lib/services/email');
            await sendEmail({
              to: receiverEmail!,
              subject: '🎁 You received a GlobalSecure Virtual Card',
              html: templates.cardCreated(
                receiverName || 'Cliente',
                cardData.last4,
                Number(issueAmount).toFixed(2),
                issueCurrency.toUpperCase()
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
                   amountRefuned: totalDeduction, 
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

    return NextResponse.json({ success: true, transferId: result.id });
  } catch (error: any) {
    console.error('Transfer creation failed:', error);
    if (error?.message === 'BALANCE_NOT_FOUND') {
      return NextResponse.json({ error: 'Balance not found' }, { status: 400 });
    }
    if (error?.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Transfer creation failed', details: error.message }, { status: 500 });
  }
}
