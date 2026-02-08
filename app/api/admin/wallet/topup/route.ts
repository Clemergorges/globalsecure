import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, amount, currency } = await req.json();

    if (!userId || !amount || !currency) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true }
    });

    if (!user || !user.wallet) {
        return NextResponse.json({ error: 'User or wallet not found' }, { status: 404 });
    }

    // Atomic TopUp
    await prisma.$transaction(async (tx) => {
        // 1. Update Wallet Balance directly (matching the current app structure)
        const wallet = await tx.wallet.findUnique({
             where: { id: user.wallet!.id }
        });

        if (!wallet) throw new Error("Wallet not found");

        const balanceField = 
            currency === 'EUR' ? 'balanceEUR' :
            currency === 'USD' ? 'balanceUSD' :
            currency === 'GBP' ? 'balanceGBP' : null;

        if (balanceField) {
             // @ts-ignore
            await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    [balanceField]: { increment: amount }
                }
            });
        } else {
            // Fallback to Balance table if it's a new currency
             const balance = await tx.balance.findUnique({
                where: { walletId_currency: { walletId: user.wallet!.id, currency } }
            });
    
            if (balance) {
                await tx.balance.update({
                    where: { id: balance.id },
                    data: { amount: { increment: amount } }
                });
            } else {
                await tx.balance.create({
                    data: {
                        walletId: user.wallet!.id,
                        currency,
                        amount
                    }
                });
            }
        }

        // 2. Create Transaction Record
        await tx.walletTransaction.create({
            data: {
                walletId: user.wallet!.id,
                type: 'DEPOSIT',
                amount: amount,
                currency: currency,
                description: 'Admin Manual Deposit',
            }
        });
    });

    // Notify
    await createNotification({
        userId,
        title: 'Depósito Recebido',
        body: `Você recebeu um depósito de ${amount} ${currency}.`,
        type: 'SUCCESS'
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin TopUp Error:', error);
    return NextResponse.json({ error: 'Failed to topup' }, { status: 500 });
  }
}