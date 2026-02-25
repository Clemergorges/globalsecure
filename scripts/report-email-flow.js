/* eslint-disable @typescript-eslint/no-var-requires */
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

function isTestEmail(email) {
  const e = (email || '').toLowerCase();
  const patterns = [
    'test', 'e2e_', 'demo', 'dev', 'staging', 'sandbox',
    '@gss.dev', '@example.com', '@mailinator.com', '@globalsecuresend.com'
  ];
  return patterns.some(p => e.includes(p));
}

async function listTestUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, emailVerified: true, createdAt: true, kycLevel: true, kycStatus: true },
    orderBy: { createdAt: 'desc' }
  });
  const testUsers = users.filter(u => isTestEmail(u.email));
  return { all: users.length, test: testUsers };
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, json };
}

async function login(email, password) {
  const url = `${BASE_URL}/api/auth/login-secure`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const setCookie = res.headers.get('set-cookie');
  let data = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, cookie: setCookie, data };
}

async function run() {
  const report = {
    env: {
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && (process.env.EMAIL_FROM || process.env.FROM_EMAIL)),
      baseUrl: BASE_URL
    },
    db: {},
    flows: {}
  };

  // 1) DB: List test users
  report.db = await listTestUsers();

  // 2) Forgot Password flow (generic response)
  const forgotTarget = 'phase3.user@gss.dev';
  const forgot = await httpJson(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email: forgotTarget })
  });
  report.flows.forgotPassword = {
    target: forgotTarget,
    http: { status: forgot.status, ok: forgot.ok },
    successFlag: forgot.json?.success === true
  };

  // 3) Resend Verification (generic response)
  const resendTarget = 'phase3.user@gss.dev';
  const resend = await httpJson(`${BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    body: JSON.stringify({ email: resendTarget })
  });
  report.flows.resendVerification = {
    target: resendTarget,
    http: { status: resend.status, ok: resend.ok },
    successFlag: resend.json?.success === true
  };

  // 4) Claim Email (requires auth)
  // Ensure test login exists (assume ensure-login-user has run; password 'dev123' by default)
  const auth = await login('phase3.user@gss.dev', process.env.PHASE3_SEED_PASSWORD || 'dev123');
  if (auth.ok && auth.cookie) {
    const claimBody = {
      amount: 20,
      currency: 'EUR',
      recipientEmail: 'qa+claimtest@globalsecuresend.com',
      recipientName: 'QA Claim',
      message: 'Teste de envio de cartão por link'
    };
    const claimRes = await fetch(`${BASE_URL}/api/claim-links`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: auth.cookie },
      body: JSON.stringify(claimBody)
    });
    let claimJson = null;
    try { claimJson = await claimRes.json(); } catch {}
    report.flows.claimCreate = {
      http: { status: claimRes.status, ok: claimRes.ok },
      emailAttempted: claimRes.status === 200 || claimRes.status === 503,
      claimUrl: claimJson?.claimUrl || null,
      note: claimRes.status === 503 ? 'Link criado; envio de email falhou (SMTP?)' : null
    };
  } else {
    report.flows.claimCreate = {
      http: { status: auth.status, ok: false },
      error: 'Login falhou; não foi possível testar envio de cartão'
    };
  }

  await prisma.$disconnect();
  console.log('=== EMAIL FLOW REPORT ===');
  console.log(JSON.stringify(report, null, 2));
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

