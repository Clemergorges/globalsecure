
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { prisma } from '../lib/db';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3012';
const JWT_SECRET = "GlobalSecureSecret2026!";
const ADMIN_EMAIL = 'clemergorges@hotmail.com';
const TEST_EMAIL = 'stress_test@demo.com';

// Helpers
const request = async (method: string, path: string, token: string | null, body?: any) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Cookie'] = `token=${token}`;
    
    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        try {
            return { status: res.status, data: JSON.parse(text) };
        } catch {
            return { status: res.status, data: text };
        }
    } catch (e) {
        return { status: 999, data: { error: 'Network Error' } };
    }
};

async function main() {
    console.log('🚀 STARTING ACID STRESS TEST SUITE\n');

    // 0. SETUP
    console.log('🔄 [SETUP] Preparing Stress Test User...');
    
    // Ensure Admin
    const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!admin) throw new Error("Admin user not found.");

    // Ensure Test User
    let user = await prisma.user.findUnique({ where: { email: TEST_EMAIL }, include: { account: true } });
    if (user) {
        // Reset everything
        if (user.account) {
            await prisma.accountTransaction.deleteMany({ where: { accountId: user.account.id } });
            await prisma.account.update({ where: { id: user.account.id }, data: { balanceEUR: 0, balanceUSD: 0, balanceGBP: 0 } });
        }
        await prisma.swap.deleteMany({ where: { userId: user.id } });
        await prisma.cryptoWithdraw.deleteMany({ where: { userId: user.id } });
    } else {
        user = await prisma.user.create({
            data: {
                email: TEST_EMAIL,
                firstName: 'Stress',
                lastName: 'Tester',
                passwordHash: 'mock', account: { create: { primaryCurrency: 'USD' } }
            },
            include: { account: true }
        });
    }

    const adminToken = jwt.sign({ userId: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '1h' });
    const userToken = jwt.sign({ userId: user!.id, email: user!.email }, JWT_SECRET, { expiresIn: '1h' });

    console.log('✅ Setup Complete.\n');

    // ==========================================
    // TEST 1: 10 Concurrent Swaps
    // ==========================================
    console.log('🧪 [TEST 1] 10 Concurrent Swaps (100 USDT Initial -> 5 USDT per Swap)');
    
    // Set Balance to 100 USD (Using USD field as proxy for USDT/USD)
    await prisma.account.update({ where: { userId: user!.id }, data: { balanceUSD: 100, balanceEUR: 0 } });
    
    const swapRequests = Array(10).fill(0).map((_, i) => 
        request('POST', '/api/swap', userToken, { 
            fromAsset: 'USD', 
            toAsset: 'EUR', 
            amount: 5 
        })
    );

    const swapResults = await Promise.all(swapRequests);
    const swapSuccess = swapResults.filter(r => r.status === 200).length;
    const swapFail = swapResults.filter(r => r.status !== 200).length;
    
    if (swapFail > 0) {
        const firstFail = swapResults.find(r => r.status !== 200);
        console.log('   First Failure Reason:', JSON.stringify(firstFail?.data));
    }
    
    const finalWallet1 = await prisma.account.findUnique({ where: { userId: user!.id } });
    
    console.log(`   Results: ${swapSuccess} Success / ${swapFail} Failed`);
    console.log(`   Final Balance: ${finalWallet1?.balanceUSD} USD`);
    
    if (swapSuccess === 10 && Number(finalWallet1?.balanceUSD) === 50) {
        console.log('✅ TEST 1 PASSED: Perfect concurrency handling.');
    } else {
        console.error('❌ TEST 1 FAILED: Balance divergence or incorrect success count.');
    }
    console.log('');

    // ==========================================
    // TEST 2: 10 Concurrent Withdrawals
    // ==========================================
    console.log('🧪 [TEST 2] 10 Concurrent Withdraws (100 USDT Initial -> 5 USDT per Withdraw)');
    
    // Set Balance to 100 USD
    await prisma.account.update({ where: { userId: user!.id }, data: { balanceUSD: 100 } });
    
    const withdrawRequests = Array(10).fill(0).map((_, i) => 
        request('POST', '/api/crypto/withdraw', userToken, { 
            amount: 5, 
            toAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' 
        })
    );

    const withdrawResults = await Promise.all(withdrawRequests);
    const withdrawSuccess = withdrawResults.filter(r => r.status === 200).length;
    const withdrawFail = withdrawResults.filter(r => r.status !== 200).length;

    if (withdrawFail > 0) {
        const firstFail = withdrawResults.find(r => r.status !== 200);
        console.log('   First Failure Reason:', JSON.stringify(firstFail?.data));
    }
    
    const finalWallet2 = await prisma.account.findUnique({ where: { userId: user!.id } });
    
    console.log(`   Results: ${withdrawSuccess} Success / ${withdrawFail} Failed`);
    console.log(`   Final Balance: ${finalWallet2?.balanceUSD} USD`);

    if (withdrawSuccess === 10 && Number(finalWallet2?.balanceUSD) === 50) {
        console.log('✅ TEST 2 PASSED: Perfect concurrency handling.');
    } else {
        console.error('❌ TEST 2 FAILED: Balance divergence or incorrect success count.');
    }
    console.log('');

    // ==========================================
    // TEST 3: Mixed (5 Swaps + 5 Withdraws)
    // ==========================================
    console.log('🧪 [TEST 3] Mixed Concurrency (100 USDT Initial -> 5 USDT per Op)');
    
    // Set Balance to 100 USD
    await prisma.account.update({ where: { userId: user!.id }, data: { balanceUSD: 100 } });
    
    const mixedRequests = [
        ...Array(5).fill(0).map(() => request('POST', '/api/swap', userToken, { fromAsset: 'USD', toAsset: 'EUR', amount: 5 })),
        ...Array(5).fill(0).map(() => request('POST', '/api/crypto/withdraw', userToken, { amount: 5, toAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }))
    ];

    // Shuffle requests to ensure true mixing
    const shuffledRequests = mixedRequests.sort(() => Math.random() - 0.5);

    const mixedResults = await Promise.all(shuffledRequests);
    const mixedSuccess = mixedResults.filter(r => r.status === 200).length;
    const mixedFail = mixedResults.filter(r => r.status !== 200).length;
    
    const finalWallet3 = await prisma.account.findUnique({ where: { userId: user!.id } });
    
    console.log(`   Results: ${mixedSuccess} Success / ${mixedFail} Failed`);
    console.log(`   Final Balance: ${finalWallet3?.balanceUSD} USD`);

    // We expect exactly 10 successful operations (since 10 * 5 = 50 spent, 50 remaining)
    if (mixedSuccess === 10 && Number(finalWallet3?.balanceUSD) === 50) {
        console.log('✅ TEST 3 PASSED: Ledger consistent under mixed load.');
    } else {
        console.error('❌ TEST 3 FAILED: Balance divergence.');
    }
    
    await prisma.$disconnect();
}

main().catch(console.error);
