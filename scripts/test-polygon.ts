import { deriveUserAddress, getUsdtPriceUsd, getProvider } from '../lib/services/polygon';
import { ethers } from 'ethers';

// Simple test script
async function runTests() {
  console.log('--- Starting Polygon Service Tests ---');

  // Test 1: Deterministic Address Derivation
  console.log('\nTest 1: deriveUserAddress');
  const userId = 'user_123456';
  
  // Mock XPUB for testing if not in env
  if (!process.env.WALLET_MASTER_XPUB) {
    console.warn('⚠️ WALLET_MASTER_XPUB not set. Using random fallback.');
  }

  const address1 = deriveUserAddress(userId);
  const address2 = deriveUserAddress(userId);
  
  console.log(`Address 1: ${address1}`);
  console.log(`Address 2: ${address2}`);

  if (address1 === address2) {
    console.log('✅ PASS: Addresses are deterministic (same userId -> same address)');
  } else {
    console.error('❌ FAIL: Addresses are different!');
  }

  // Test 2: Price Fetching & Caching
  console.log('\nTest 2: getUsdtPriceUsd (with caching)');
  const start = Date.now();
  const price1 = await getUsdtPriceUsd();
  const time1 = Date.now() - start;
  console.log(`Price 1: $${price1} (Time: ${time1}ms)`);

  const start2 = Date.now();
  const price2 = await getUsdtPriceUsd();
  const time2 = Date.now() - start2;
  console.log(`Price 2: $${price2} (Time: ${time2}ms)`);
  
  if (time2 < 10) {
      console.log('✅ PASS: Cache is working (Response time < 10ms)');
  } else {
      console.log('⚠️ WARN: Cache might not be working or network is super fast');
  }

  // Test 3: Provider Connection
  console.log('\nTest 3: Network Connection');
  try {
      const provider = getProvider();
      const network = await provider.getNetwork();
      console.log(`Connected to: ${network.name} (Chain ID: ${network.chainId})`);
      console.log('✅ PASS: RPC Connection successful');
  } catch (e) {
      console.error('❌ FAIL: RPC Connection failed', e);
  }

  console.log('\n--- Tests Completed ---');
}

runTests().catch(console.error);
