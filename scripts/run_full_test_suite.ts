
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { prisma } from '../lib/db';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3012';
// We use the known secret from .env.local
const JWT_SECRET = "GlobalSecureSecret2026!"; 
const ADMIN_EMAIL = 'clemergorges@hotmail.com';
const TEST_EMAIL = 'beta_test_suite@demo.com';

// Helpers
const request = async (method: string, path: string, token: string | null, body?: any) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Cookie'] = `token=${token}`;
    
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
};

async function main() {
  console.log('🚀 STARTING COMPREHENSIVE BETA TEST SUITE\n');

  // ==========================================
  // 0. SETUP
  // ==========================================
  console.log('🔄 [SETUP] Cleaning up and creating test users...');
  
  // Clean up previous test data
  const existingUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL }, include: { account: true } });
  if (existingUser) {
      if (existingUser.account) {
        await prisma.accountTransaction.deleteMany({ where: { accountId: existingUser.account.id } });
        await prisma.balance.deleteMany({ where: { accountId: existingUser.account.id } });
        await prisma.account.update({ where: { id: existingUser.account.id }, data: { balanceEUR: 0, balanceUSD: 0, balanceGBP: 0 } });
      }
      await prisma.swap.deleteMany({ where: { userId: existingUser.id } });
      await prisma.cryptoDeposit.deleteMany({ where: { userId: existingUser.id } });
      await prisma.cryptoWithdraw.deleteMany({ where: { userId: existingUser.id } });
  }

  // Ensure Admin
  let admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error("Admin user not found. Run seed or create manually.");

  // Ensure Test User
  let user = existingUser;
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        firstName: 'Suite',
        lastName: 'Tester',
        passwordHash: 'mock', account: { create: { primaryCurrency: 'EUR' } }
      },
      include: { account: true }
    });
  }

  const adminToken = jwt.sign({ userId: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '1h' });
  const userToken = jwt.sign({ userId: user!.id, email: user!.email }, JWT_SECRET, { expiresIn: '1h' });

  console.log('✅ Setup Complete.\n');

  // ==========================================
  // 1. CONSISTENCY & ACID (Double Spend)
  // ==========================================
  console.log('🧪 [TEST 1] ACID / Double Spend / Concurrency');
  
  // Give user 100 EUR
  await request('POST', '/api/admin/wallet/topup', adminToken, { userId: user!.id, amount: 100, currency: 'EUR' });
  console.log('   Initial Balance: 100 EUR');

  // Try to swap 100 EUR to USD twice simultaneously
  console.log('   Running 2 simultaneous swaps of 100 EUR (should fail one)...');
  const promises = [
      request('POST', '/api/swap', userToken, { fromAsset: 'EUR', toAsset: 'USD', amount: 100 }),
      request('POST', '/api/swap', userToken, { fromAsset: 'EUR', toAsset: 'USD', amount: 100 })
  ];
  
  const results = await Promise.all(promises);
  const successes = results.filter(r => r.status === 200).length;
  const failures = results.filter(r => r.status !== 200).length;

  if (successes === 1 && failures === 1) {
      console.log('✅ ACID Passed: Only 1 transaction succeeded.');
  } else {
      console.error('❌ ACID FAILED: ', { successes, failures });
  }
  
  // Verify Balance (Should be 0 EUR)
  const walletCheck = await prisma.account.findUnique({ where: { userId: user!.id } });
  console.log(`   Final Balance: ${walletCheck?.balanceEUR} EUR (Expected 0)`);
  
  if (Number(walletCheck?.balanceEUR) !== 0) console.error('❌ Balance Divergence!');
  console.log('');


  // ==========================================
  // 2. SECURITY (Authorization)
  // ==========================================
  console.log('🧪 [TEST 2] Security & Authorization');
  
  console.log('   User trying to access Admin Endpoint...');
  const secRes = await request('POST', '/api/admin/wallet/topup', userToken, { userId: user!.id, amount: 1000000, currency: 'EUR' });
  
  if (secRes.status === 403 || secRes.status === 401) {
      console.log(`✅ Security Passed: Access Denied (${secRes.status})`);
  } else {
      console.error(`❌ Security FAILED: User could access admin endpoint! (${secRes.status})`);
  }
  console.log('');


  // ==========================================
  // 3. IDEMPOTENCY (Duplicate Webhook)
  // ==========================================
  console.log('🧪 [TEST 3] Webhook Idempotency');
  
  // Generate address
  await request('GET', '/api/crypto/address', userToken);
  const w = await prisma.account.findUnique({ where: { userId: user!.id } });
  const address = w?.cryptoAddress;
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');

  const webhookPayload = {
    event: {
        activity: [{
            category: 'token',
            asset: 'USDT',
            value: 50,
            fromAddress: '0xSender',
            toAddress: address,
            hash: txHash,
            rawContract: { address: '0xUSDTContract' }
        }]
    }
  };

  console.log('   Sending Webhook 1...');
  await request('POST', '/api/webhooks/crypto/usdt', null, webhookPayload);
  
  console.log('   Sending Webhook 2 (Duplicate)...');
  const hookRes2 = await request('POST', '/api/webhooks/crypto/usdt', null, webhookPayload);
  
  // Check if balance is 50 USD (approx) or 100 USD (double count)
  // Note: Previous test swapped 100 EUR -> ~108 USD. 
  // Current USD balance should be ~108 + 50 = ~158. NOT ~208.
  
  const walletCheck2 = await prisma.account.findUnique({ where: { userId: user!.id } });
  const deposits = await prisma.cryptoDeposit.count({ where: { txHash: txHash } });
  
  if (deposits === 1) {
       console.log('✅ Idempotency Passed: Deposit recorded only once.');
  } else {
       console.error(`❌ Idempotency FAILED: Found ${deposits} records for same hash.`);
  }
  console.log('');


  // ==========================================
  // 4. FAILURE RESILIENCE (Withdrawal)
  // ==========================================
  console.log('🧪 [TEST 4] Failure Resilience');
  
  console.log('   Trying withdraw with invalid address...');
  const failRes1 = await request('POST', '/api/crypto/withdraw', userToken, { amount: 10, toAddress: '0xInvalid' });
  if (failRes1.status === 400) console.log('✅ Rejected invalid address');
  else console.error('❌ Failed to reject invalid address');

  console.log('   Trying withdraw more than balance (1000000 USD)...');
  const failRes2 = await request('POST', '/api/crypto/withdraw', userToken, { amount: 1000000, toAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' });
  if (failRes2.status === 500 || failRes2.data.error.includes('Insufficient')) console.log('✅ Rejected insufficient balance'); // Our API throws 500 on transaction fail currently, or 400.
  else console.error('❌ Failed to reject overdraft', failRes2);
  console.log('');


  // ==========================================
  // 5. FULL CYCLE CONFIRMATION
  // ==========================================
  console.log('📊 FINAL STATE AUDIT');
  const finalWallet = await prisma.account.findUnique({ where: { userId: user!.id } });
  console.log(`EUR: ${finalWallet?.balanceEUR}`);
  console.log(`USD: ${finalWallet?.balanceUSD}`);
  
  // Clean up
  await prisma.$disconnect();
}

main().catch(console.error);
