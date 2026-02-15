import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Simple protection
  if (process.env.CRON_SECRET && searchParams.get('key') !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const duePayments = await prisma.recurringPayment.findMany({
      where: {
        status: 'ACTIVE',
        nextRunDate: { lte: new Date() }
      }
    });

    const results = { success: 0, failed: 0 };

    for (const payment of duePayments) {
      try {
        // In a real implementation, call the transfer service here.
        // await transferService.execute({ ... });
        
        // Calculate next date
        const nextDate = new Date(payment.nextRunDate);
        switch (payment.frequency) {
            case 'DAILY': nextDate.setDate(nextDate.getDate() + 1); break;
            case 'WEEKLY': nextDate.setDate(nextDate.getDate() + 7); break;
            case 'BIWEEKLY': nextDate.setDate(nextDate.getDate() + 14); break;
            case 'MONTHLY': nextDate.setMonth(nextDate.getMonth() + 1); break;
            case 'QUARTERLY': nextDate.setMonth(nextDate.getMonth() + 3); break;
        }
        
        // Update payment record
        await prisma.recurringPayment.update({
          where: { id: payment.id },
          data: { nextRunDate: nextDate }
        });

        // Get Wallet ID (Assuming one wallet per user for now)
        const account = await prisma.account.findUnique({ where: { userId: payment.userId } });

        if (account) {
            // Log Transaction
            await prisma.userTransaction.create({
                data: {
                    userId: payment.userId,
                    accountId: account.id,
                    type: 'TRANSFER',
                    amount: payment.amount,
                    currency: payment.currency,
                    status: 'COMPLETED',
                    metadata: { 
                        recurringPaymentId: payment.id,
                        recipient: payment.recipientId
                    }
                }
            });
        }

        results.success++;
      } catch (err) {
        console.error(`Failed to process recurring payment ${payment.id}:`, err);
        results.failed++;
      }
    }

    return NextResponse.json({ processed: duePayments.length, results });

  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: 'Failed to process queue' }, { status: 500 });
  }
}