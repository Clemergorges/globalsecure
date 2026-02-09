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
            // 1. Update Balance (Unified)
            await tx.balance.upsert({
                where: { walletId_currency: { walletId: user.wallet!.id, currency } },
                update: { amount: { increment: amount } },
                create: {
                    walletId: user.wallet!.id,
                    currency,
                    amount
                }
            });

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
            body: `You received a deposit of ${amount} ${currency}.`,
            type: 'SUCCESS'
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Admin TopUp Error:', error);
        return NextResponse.json({ error: 'Failed to topup' }, { status: 500 });
    }
}