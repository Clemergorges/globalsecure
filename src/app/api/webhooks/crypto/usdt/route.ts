import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getUsdtPriceUsd } from '@/lib/services/polygon';

// Webhook to receive deposit notifications from Alchemy
export async function POST(req: Request) {
  try {
    const bodyText = await req.text(); // Get raw body for HMAC
    const signature = req.headers.get('x-alchemy-signature'); // Verify specific header name
    const WEBHOOK_SECRET = process.env.ALCHEMY_WEBHOOK_SECRET;

    // 1. Validate HMAC Signature
    if (WEBHOOK_SECRET && signature) {
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        hmac.update(bodyText);
        const digest = hmac.digest('hex');
        
        if (signature !== digest) {
            console.error('Invalid Webhook Signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    } else {
        // Warn if running without security in dev
        console.warn('Skipping signature validation (Missing Secret or Header)');
    }

    const body = JSON.parse(bodyText);
    console.log('Received crypto webhook:', JSON.stringify(body));

    // Alchemy Notify payload structure
    const activity = body.event?.activity?.[0];
    if (!activity) {
      console.log('No activity found in payload');
      return NextResponse.json({ received: true });
    }

    // Extract relevant data
    // category: 'token' (for ERC20)
    // fromAddress, toAddress, value, asset, hash
    const { toAddress, fromAddress, value, asset, hash, category, rawContract } = activity;

    // Filter only USDT transactions (Contract Address Check)
    const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS?.toLowerCase();
    const contractAddress = rawContract?.address?.toLowerCase();

    // Relaxed check for Dev/Testnet (if contract matches OR asset is USDT)
    const isUsdt = (contractAddress === USDT_CONTRACT) || (asset === 'USDT');

    if (category === 'token' && isUsdt) {
        console.log(`Processing USDT Deposit: ${value} to ${toAddress}`);

        // Check if tx already processed
        const existing = await prisma.cryptoDeposit.findUnique({
            where: { txHash: hash }
        });

        if (existing) {
            console.log('Transaction already processed:', hash);
            return NextResponse.json({ received: true });
        }

        // 2. Find User by Deposit Address (Reverse lookup)
        // Now we use the persisted address in Wallet model
        const account = await prisma.account.findFirst({
            where: { cryptoAddress: toAddress },
            include: { user: true }
        });

        if (!account) {
            console.warn(`[ORPHANED] Deposit to unknown address: ${toAddress}`);
            // TODO: Log to OrphanedDeposits table for manual review
            return NextResponse.json({ received: true, status: 'orphaned' });
        }

        const userId = account.userId;
        const amount = parseFloat(value);

        // 3. Process Deposit Transaction (Atomic)
        await prisma.$transaction(async (tx) => {
            // A. Create Deposit Record
            const deposit = await tx.cryptoDeposit.create({
                data: {
                    userId: userId,
                    txHash: hash,
                    network: 'POLYGON',
                    token: 'USDT',
                    amount: amount,
                    status: 'CREDITED', // Auto-confirming for MVP
                    confirmedAt: new Date(),
                    creditedAt: new Date(),
                }
            });

            // B. Get USD Price for history/conversion (Optional)
            const usdtPrice = await getUsdtPriceUsd();
            const amountUsd = amount * usdtPrice;

            // C. Update Wallet Balance (Unified - USD)
            await tx.balance.upsert({
                where: {
                    accountId_currency: {
                        accountId: account.id,
                        currency: 'USD'
                    }
                },
                update: {
                    amount: { increment: amountUsd }
                },
                create: {
                    accountId: account.id,
                    currency: 'USD',
                    amount: amountUsd
                }
            });

            // D. Create Wallet Transaction Log
            await tx.accountTransaction.create({
                data: {
                    accountId: account.id,
                    type: 'DEPOSIT', // Using existing enum
                    amount: amountUsd,
                    currency: 'USD',
                    description: `Crypto Deposit (${amount} USDT)`,
                    // transferId: deposit.id // If we linked it
                }
            });

            // E. Create Notification
            await tx.notification.create({
                data: {
                    userId: userId,
                    title: 'Deposit Received',
                    body: `You received ${amount} USDT (~$${amountUsd.toFixed(2)}).`,
                    type: 'SUCCESS'
                }
            });
        });

        console.log(`[SUCCESS] Credited ${amount} USDT to User ${userId}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
