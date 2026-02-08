
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3012';
const JWT_SECRET = "GlobalSecureSecret2026!"; // Hardcoded for test safety

const ADMIN_EMAIL = 'clemergorges@hotmail.com';
const TEST_EMAIL = 'beta_sim@demo.com';

async function main() {
  const { prisma } = await import('../lib/db');
  const { hashPassword } = await import('../lib/auth');

  console.log('🚀 Starting BETA Simulation...');

  // 1. Setup Users
  console.log('👤 Setting up users...');
  
  // Ensure Admin
  let admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    console.log('Creating Admin...');
    admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: await hashPassword('admin123'),
        wallet: { create: { primaryCurrency: 'EUR' } }
      },
      include: { wallet: true }
    });
  }

  // Ensure Test User
  let user = await prisma.user.findUnique({ 
      where: { email: TEST_EMAIL },
      include: { wallet: true }
  });
  
  if (user) {
    // Reset Balance for clean test
    // Find wallet first
    const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (w) {
        await prisma.wallet.update({
            where: { id: w.id },
            data: { balanceEUR: 0, balanceUSD: 0, balanceGBP: 0 } 
        });
        await prisma.walletTransaction.deleteMany({ where: { walletId: w.id } });
    }
    
    await prisma.swap.deleteMany({ where: { userId: user.id } });
    await prisma.cryptoDeposit.deleteMany({ where: { userId: user.id } });
    await prisma.cryptoWithdraw.deleteMany({ where: { userId: user.id } });
    
  } else {
    console.log('Creating Test User...');
    user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        firstName: 'Beta',
        lastName: 'Tester',
        passwordHash: await hashPassword('test1234'),
        wallet: { create: { primaryCurrency: 'EUR' } }
      },
      include: { wallet: true }
    });
  }

  console.log(`   Test User ID: ${user.id}`);
  console.log(`   Test Wallet ID: ${user.wallet?.id}`);

  // Generate Tokens
  const adminToken = jwt.sign({ userId: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '1h' });
  console.log('[Script] JWT_SECRET:', JWT_SECRET.substring(0, 5) + '...');
  const userToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

  // Helper for Requests
  const request = async (method: string, path: string, token: string | null, body?: any) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Cookie'] = `token=${token}`;
    
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    const text = await res.text();
    console.log(`[Request] ${method} ${path} -> ${res.status}`);
    try {
        return { status: res.status, data: JSON.parse(text) };
    } catch {
        return { status: res.status, data: text };
    }
  };

  // ==========================================
  // STEP 1: Admin Add Balance (1000 EUR)
  // ==========================================
  console.log('\nTesting 1: Admin Topup (1000 EUR)...');
  const res1 = await request('POST', '/api/admin/wallet/topup', adminToken, {
    userId: user.id,
    amount: 1000,
    currency: 'EUR'
  });
  
  if (res1.status === 200 && res1.data.success) {
    console.log('✅ Topup Successful');
  } else {
    console.error('❌ Topup Failed', res1);
    process.exit(1);
  }

  // Verify Balance
  const walletAfterTopup = await prisma.wallet.findUnique({ where: { userId: user.id } });
  console.log(`   Current Balance: €${walletAfterTopup?.balanceEUR}`);

  // ==========================================
  // STEP 2: Swap (100 EUR -> USD)
  // ==========================================
  console.log('\nTesting 2: Swap (100 EUR -> USD)...');
  const res2 = await request('POST', '/api/swap', userToken, {
    fromAsset: 'EUR',
    toAsset: 'USD',
    amount: 100
  });

  if (res2.status === 200 && res2.data.success) {
    console.log(`✅ Swap Successful: ${res2.data.message}`);
  } else {
    console.error('❌ Swap Failed', res2);
    process.exit(1);
  }

  // ==========================================
  // STEP 3: Crypto Deposit (50 USDT)
  // ==========================================
  console.log('\nTesting 3: Crypto Deposit (50 USDT)...');
  // Need to know the user's crypto address first
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  let address = wallet?.cryptoAddress;
  
  if (!address) {
      // Generate it
      await request('GET', '/api/crypto/address', userToken);
      const w = await prisma.wallet.findUnique({ where: { userId: user.id } });
      address = w?.cryptoAddress;
  }
  
  console.log(`   User Address: ${address}`);

  const webhookPayload = {
    event: {
        activity: [{
            category: 'token',
            asset: 'USDT',
            value: 50,
            fromAddress: '0xExternalWallet',
            toAddress: address,
            hash: '0x' + Math.random().toString(16).substring(2),
            rawContract: { address: '0xUSDTContract' } // Mock check
        }]
    }
  };

  const res3 = await request('POST', '/api/webhooks/crypto/usdt', null, webhookPayload);
  if (res3.status === 200) {
      console.log('✅ Webhook Processed');
  } else {
      console.error('❌ Webhook Failed', res3);
  }

  // ==========================================
  // STEP 4: Crypto Withdraw (10 USDT)
  // ==========================================
  console.log('\nTesting 4: Crypto Withdraw (10 USDT)...');
  const validAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'; // Valid Checksum Address
  const res4 = await request('POST', '/api/crypto/withdraw', userToken, {
      amount: 10,
      toAddress: validAddress
  });

  if (res4.status === 200 && res4.data.success) {
      console.log(`✅ Withdraw Requested: ID ${res4.data.withdrawId}`);
  } else {
      console.error('❌ Withdraw Failed', res4);
      process.exit(1);
  }

  // ==========================================
  // STEP 5: Cron Job (Process Queue)
  // ==========================================
  console.log('\nTesting 5: Cron Job (Process Withdraw)...');
  const res5 = await request('GET', '/api/cron/process-queue', null); // No auth in dev
  console.log('   Cron Result:', res5.data);

  // ==========================================
  // FINAL REPORT
  // ==========================================
  console.log('\n📊 FINAL REPORT');
  const finalWallet = await prisma.wallet.findUnique({ 
      where: { userId: user.id },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } }
  });

  console.log('--- Balances ---');
  console.log(`EUR: ${finalWallet?.balanceEUR}`);
  console.log(`USD: ${finalWallet?.balanceUSD}`);
  console.log(`GBP: ${finalWallet?.balanceGBP}`);
  
  console.log('\n--- Recent Transactions ---');
  finalWallet?.transactions.forEach(tx => {
      console.log(`[${tx.type}] ${tx.amount} ${tx.currency} - ${tx.description}`);
  });

  const withdraws = await prisma.cryptoWithdraw.findMany({ where: { userId: user.id } });
  console.log('\n--- Withdraws ---');
  withdraws.forEach(w => {
      console.log(`ID: ${w.id} | Status: ${w.status} | Tx: ${w.txHash}`);
  });

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
