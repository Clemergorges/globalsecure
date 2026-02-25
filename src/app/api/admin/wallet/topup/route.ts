import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/rbac';
import { logAudit } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const actor = await requireRole(req, [UserRole.ADMIN, UserRole.TREASURY]);
    if (actor instanceof NextResponse) return actor;
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const method = req.method;
    const path = req.nextUrl.pathname;

    try {
        const { userId, amount, currency } = await req.json();

        if (!userId || !amount || !currency) {
            logAudit({
              userId: actor.userId,
              action: 'TREASURY_MANUAL_TOPUP',
              status: 'FAILURE',
              ipAddress,
              userAgent,
              method,
              path,
              metadata: { reason: 'INVALID_INPUT', targetUserId: userId || null },
            });
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { account: true }
        });

        if (!user || !user.account) {
            logAudit({
              userId: actor.userId,
              action: 'TREASURY_MANUAL_TOPUP',
              status: 'FAILURE',
              ipAddress,
              userAgent,
              method,
              path,
              metadata: { reason: 'USER_OR_WALLET_NOT_FOUND', targetUserId: userId },
            });
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

        logAudit({
          userId: actor.userId,
          action: 'TREASURY_MANUAL_TOPUP',
          status: 'SUCCESS',
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { targetUserId: userId, amount, currency },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Admin TopUp Error:', error);
        logAudit({
          userId: actor.userId,
          action: 'TREASURY_MANUAL_TOPUP',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          method,
          path,
          metadata: { reason: 'EXCEPTION' },
        });
        return NextResponse.json({ error: 'Failed to topup' }, { status: 500 });
    }
}
