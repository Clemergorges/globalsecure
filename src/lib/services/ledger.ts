import { prisma } from '@/lib/db';
import { pusherService } from '@/lib/services/pusher';
import { ApiError } from '@/lib/api-handler';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';

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
    throw new ApiError(400, 'INVALID_AMOUNT', 'Amount must be positive');
  }

  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail },
    include: { account: true }
  });

  if (!recipient) {
    throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'Recipient not found');
  }

  if (recipient.id === senderId) {
    throw new ApiError(400, 'CANNOT_TRANSFER_TO_SELF', 'Cannot transfer to yourself');
  }

  if (!recipient.account) {
    throw new ApiError(400, 'RECIPIENT_WALLET_INACTIVE', 'Recipient wallet not active');
  }

  const senderWallet = await prisma.account.findUnique({
    where: { userId: senderId }
  });

  if (!senderWallet) {
    throw new ApiError(400, 'SENDER_WALLET_NOT_FOUND', 'Sender wallet not found');
  }

  // Calculate Fees
  const feePercentage = 1.8;
  const feeAmount = Number((amount * feePercentage / 100).toFixed(2));
  const totalDeduction = amount + feeAmount;

  // 2. ATOMIC TRANSACTION (MULTI-CURRENCY SUPPORT)
  const transfer = await prisma.$transaction(async (tx) => {

    try {
      await applyFiatMovement(tx, senderId, currency, -totalDeduction);
    } catch (e: any) {
      if (e?.message === 'BALANCE_NOT_FOUND') {
        throw new ApiError(400, 'BALANCE_NOT_FOUND', 'Balance for this currency was not found');
      }
      if (e?.message === 'INSUFFICIENT_FUNDS') {
        throw new ApiError(409, 'INSUFFICIENT_FUNDS', 'Insufficient funds');
      }
      throw e;
    }

    await applyFiatMovement(tx, recipient.id, currency, amount);

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

    // 2.3.1 Create User Transactions for statement (sender + recipient)
    await tx.userTransaction.create({
      data: {
        userId: senderId,
        accountId: senderWallet.id,
        type: 'TRANSFER',
        amount: amount,
        currency: currency,
        status: 'COMPLETED',
        metadata: {
          direction: 'OUT',
          recipientEmail: recipient.email,
          transferId: newTransfer.id,
          fee: feeAmount,
          totalDeduction,
        }
      }
    });

    await tx.userTransaction.create({
      data: {
        userId: recipient.id,
        accountId: recipient.account!.id,
        type: 'TRANSFER',
        amount: amount,
        currency: currency,
        status: 'COMPLETED',
        metadata: {
          direction: 'IN',
          senderEmail: senderEmail,
          transferId: newTransfer.id,
        }
      }
    });

    await tx.userTransaction.create({
      data: {
        userId: senderId,
        accountId: senderWallet.id,
        type: 'FEE',
        amount: feeAmount,
        currency: currency,
        status: 'COMPLETED',
        metadata: {
          direction: 'OUT',
          recipientEmail: recipient.email,
          transferId: newTransfer.id,
          feePercentage,
        }
      }
    });

    // 2.4 Create Wallet Transactions (Sender Debit)
    await tx.accountTransaction.create({
      data: {
        accountId: senderWallet.id,
        type: 'DEBIT',
        amount: amount,
        currency: currency,
        description: `Transfer to ${recipientEmail}`,
        transferId: newTransfer.id
      }
    });

    // Fee Transaction
    await tx.accountTransaction.create({
      data: {
        accountId: senderWallet.id,
        type: 'FEE',
        amount: feeAmount,
        currency: currency,
        description: `Fee for transfer to ${recipientEmail}`,
        transferId: newTransfer.id
      }
    });

    // 2.5 Create Wallet Transaction (Recipient Credit)
    await tx.accountTransaction.create({
      data: {
        accountId: recipient.account!.id,
        type: 'CREDIT',
        amount: amount,
        currency: currency,
        description: `Received from ${senderEmail}`,
        transferId: newTransfer.id
      }
    });

    return newTransfer;
  }, {
    timeout: 10000 // Increase timeout to 10s for high concurrency
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
