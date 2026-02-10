import { prisma } from '@/lib/db';
import { pusherService } from '@/lib/services/pusher';

export interface TransferResult {
  success: boolean;
  transfer?: any;
  error?: string;
  details?: any;
}

export async function processInternalTransfer(
  senderId: string,
  senderEmail: string,
  recipientEmail: string,
  amount: number,
  currency: string
): Promise<TransferResult> {
  // 1. Validations
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail },
    include: { wallet: true }
  });

  if (!recipient) {
    throw new Error('Recipient not found');
  }

  if (recipient.id === senderId) {
    throw new Error('Cannot transfer to yourself');
  }

  if (!recipient.wallet) {
    throw new Error('Recipient wallet not active');
  }

  const senderWallet = await prisma.wallet.findUnique({
    where: { userId: senderId }
  });

  if (!senderWallet) {
    throw new Error('Sender wallet not found');
  }

  // Calculate Fees
  const feePercentage = 1.8;
  const feeAmount = Number((amount * feePercentage / 100).toFixed(2));
  const totalDeduction = amount + feeAmount;

  // 2. ATOMIC TRANSACTION (MULTI-CURRENCY SUPPORT)
  // We now update the 'Balance' table instead of 'Wallet' columns
  const transfer = await prisma.$transaction(async (tx) => {

    // 2.1 Atomic Debit (Check Balance + Deduct in one go)
    // We look for a Balance record for this wallet AND currency
    // And ensure amount >= totalDeduction
    const debitResult = await tx.balance.updateMany({
      where: {
        walletId: senderWallet.id,
        currency: currency,
        amount: { gte: totalDeduction } // Crucial: WHERE balance >= total
      },
      data: {
        amount: { decrement: totalDeduction }
      }
    });

    if (debitResult.count === 0) {
      // Fallback: Check if balance record exists at all to give better error
      const balanceExists = await tx.balance.findUnique({
        where: { walletId_currency: { walletId: senderWallet.id, currency } }
      });
      if (!balanceExists) {
        throw new Error(`Saldo em ${currency} não encontrado.`);
      }
      throw new Error('Insufficient funds or concurrent transaction conflict');
    }

    // 2.2 Credit Recipient
    // We use upsert to ensure the balance row exists
    const recipientBalance = await tx.balance.findUnique({
      where: { walletId_currency: { walletId: recipient.wallet!.id, currency } }
    });

    if (recipientBalance) {
      await tx.balance.update({
        where: { id: recipientBalance.id },
        data: { amount: { increment: amount } }
      });
    } else {
      await tx.balance.create({
        data: {
          walletId: recipient.wallet!.id,
          currency: currency,
          amount: amount
        }
      });
    }

    // 2.3 Create Transfer Record
    const newTransfer = await tx.transfer.create({
      data: {
        senderId,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        recipientName: `${recipient.firstName} ${recipient.lastName}`.trim(),
        amountSent: amount,
        currencySent: currency,
        amountReceived: amount,
        currencyReceived: currency,
        fee: feeAmount,
        feePercentage: feePercentage,
        exchangeRate: 1.0,
        type: 'ACCOUNT',
        status: 'COMPLETED',
        completedAt: new Date(),
        logs: {
          create: {
            type: 'INTERNAL_TRANSFER',
            metadata: {
              fee: feeAmount,
              totalDeduction
            }
          }
        }
      }
    });

    // 2.4 Create Wallet Transactions (Sender Debit)
    await tx.walletTransaction.create({
      data: {
        walletId: senderWallet.id,
        type: 'DEBIT',
        amount: amount,
        currency: currency,
        description: `Transfer to ${recipientEmail}`,
        transferId: newTransfer.id
      }
    });

    // Fee Transaction
    await tx.walletTransaction.create({
      data: {
        walletId: senderWallet.id,
        type: 'FEE',
        amount: feeAmount,
        currency: currency,
        description: `Fee for transfer to ${recipientEmail}`,
        transferId: newTransfer.id
      }
    });

    // 2.5 Create Wallet Transaction (Recipient Credit)
    await tx.walletTransaction.create({
      data: {
        walletId: recipient.wallet!.id,
        type: 'CREDIT',
        amount: amount,
        currency: currency,
        description: `Received from ${senderEmail}`,
        transferId: newTransfer.id
      }
    });

    return newTransfer;
  });

  // 3. Real-time Notifications (Non-blocking)
  try {
    await Promise.all([
      pusherService.trigger(`user-${senderId}`, 'transfer:sent', {
        id: transfer.id,
        amount: amount,
        currency: currency,
        recipient: recipientEmail
      }),
      pusherService.trigger(`user-${recipient.id}`, 'transfer:received', {
        id: transfer.id,
        amount: amount,
        currency: currency,
        sender: senderEmail
      })
    ]);
  } catch (pushError) {
    console.error('Pusher notification failed:', pushError);
  }

  return { success: true, transfer };
}
