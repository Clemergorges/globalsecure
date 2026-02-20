import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';

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
            include: { account: true }
        });

        if (!user || !user.account) {
            return NextResponse.json({ error: 'User or wallet not found' }, { status: 404 });
        }

        // Atomic TopUp
        await prisma.$transaction(async (tx) => {
            await applyFiatMovement(tx, userId, currency, amount);

            // 2. Create Transaction Record
            await tx.accountTransaction.create({
                data: {
                    accountId: user.account!.id,
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
