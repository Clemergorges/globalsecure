import fetch from 'node-fetch';

async function run() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  console.log('Testing SEPA (EU) deposit credit (simulated)...');
  try {
    const res = await fetch(`${baseUrl}/api/wallet/deposit/sepa`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 25, instant: false })
    });
    console.log('SEPA POST status:', res.status);
    console.log('SEPA POST body:', await res.text());
  } catch (e) {
    console.error('SEPA test failed:', e);
  }

  console.log('Testing Card (EU) topup checkout creation...');
  try {
    const res = await fetch(`${baseUrl}/api/wallet/topup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 50, currency: 'EUR' })
    });
    console.log('Card TopUp status:', res.status);
    console.log('Card TopUp body:', await res.text());
  } catch (e) {
    console.error('Card test failed:', e);
  }

  console.log('Testing PIX (BR) deposit credit (simulated)...');
  try {
    const res = await fetch(`${baseUrl}/api/wallet/deposit/pix`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 35 })
    });
    console.log('PIX POST status:', res.status);
    console.log('PIX POST body:', await res.text());
  } catch (e) {
    console.error('PIX test failed:', e);
  }

  console.log('Testing Crypto USDT webhook credit (requires request payload)...');
  console.log('Use /api/webhooks/crypto/usdt with appropriate data in a separate test.');
}

run();
