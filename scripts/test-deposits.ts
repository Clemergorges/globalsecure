const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB'
]);

let cookieHeader = '';

async function req(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookieHeader) headers['cookie'] = cookieHeader;
  const res = await (globalThis as any).fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

function extractTokenFromSetCookie(setCookie: string | null) {
  if (!setCookie) return '';
  const m = setCookie.match(/token=([^;]+)/);
  return m ? `token=${m[1]}` : '';
}

async function login(email: string, password: string) {
  const r = await req('POST', '/api/auth/login', { email, password });
  if (r.status === 200) {
    const setCookie = r.headers.get('set-cookie');
    const tokenCookie = extractTokenFromSetCookie(setCookie);
    if (tokenCookie) cookieHeader = tokenCookie;
  }
  return r;
}

async function main() {
  const email = process.env.TEST_EMAIL || process.env.ADMIN_EMAIL || 'clemergorges@hotmail.com';
  const password = process.env.TEST_PASSWORD || 'admin123';

  console.log('Login');
  const loginRes = await login(email, password);
  console.log(loginRes.status, loginRes.data);

  console.log('Me');
  const meRes = await req('GET', '/api/auth/me');
  console.log(meRes.status, meRes.data);
  if (meRes.status !== 200) return;
  const user = (meRes as any).data.user;
  const country = user?.country || 'LU';
  const isEU = EU_COUNTRIES.has(country);
  const isBR = country === 'BR';

  if (isEU) {
    console.log('SEPA deposit');
    const sepaRes = await req('POST', '/api/wallet/deposit/sepa', { amount: 25, instant: false });
    console.log(sepaRes.status, sepaRes.data);

    console.log('Card topup EUR');
    const cardRes = await req('POST', '/api/wallet/topup', { amount: 50, currency: 'EUR' });
    console.log(cardRes.status, cardRes.data);
  }

  if (isBR) {
    console.log('PIX deposit');
    const pixRes = await req('POST', '/api/wallet/deposit/pix', { amount: 35 });
    console.log(pixRes.status, pixRes.data);

    console.log('Bank BR deposit');
    const bankRes = await req('POST', '/api/wallet/deposit/bank-br', { amount: 200 });
    console.log(bankRes.status, bankRes.data);

    console.log('Card topup BRL');
    const cardBrRes = await req('POST', '/api/wallet/topup', { amount: 50, currency: 'BRL' });
    console.log(cardBrRes.status, cardBrRes.data);
  }

  console.log('Crypto address');
  const cryptoAddr = await req('GET', '/api/crypto/address');
  console.log(cryptoAddr.status, cryptoAddr.data);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
