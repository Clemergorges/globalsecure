/**
 * Garante que o usuário de teste existe e consegue logar.
 * Use quando receber "Invalid credentials" no login.
 *
 * Uso: npx dotenv -e .env.local -- node scripts/ensure-login-user.js
 * ou:  npm run ensure:login
 */
const path = require('path');
const base = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(base, '.env') });
require('dotenv').config({ path: path.join(base, '.env.local'), override: true });
require('dotenv').config({ path: path.join(base, '.env.development'), override: true });
require('dotenv').config({ path: path.join(base, '.env.development.local'), override: true });

const bcrypt = require('bcryptjs');
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAIL = 'phase3.user@gss.dev';
const PASSWORD = process.env.PHASE3_SEED_PASSWORD || 'dev123';
const SALDO_INICIAL_EUR = 500; // para testar envio/recebimento

async function main() {
  console.log('Verificando usuário de login...');
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      passwordHash,
      emailVerified: true,
    },
    create: {
      email: EMAIL,
      passwordHash,
      emailVerified: true,
      firstName: 'Phase3',
      lastName: 'User',
      yieldEnabled: true,
      yieldEnabledAt: new Date(),
    },
    select: { id: true, email: true },
  });

  await prisma.account.upsert({
    where: { userId: user.id },
    update: { status: 'ACTIVE', primaryCurrency: 'EUR' },
    create: {
      userId: user.id,
      status: 'ACTIVE',
      primaryCurrency: 'EUR',
      balances: { create: { currency: 'EUR', amount: 0 } },
    },
  });

  await prisma.fiatBalance.upsert({
    where: { userId_currency: { userId: user.id, currency: 'EUR' } },
    update: { amount: new Prisma.Decimal(SALDO_INICIAL_EUR) },
    create: {
      userId: user.id,
      currency: 'EUR',
      amount: new Prisma.Decimal(SALDO_INICIAL_EUR),
    },
  });

  console.log('OK. Use estas credenciais no login:');
  console.log('  Email:', EMAIL);
  console.log('  Senha:', PASSWORD);
  console.log('  Saldo EUR:', SALDO_INICIAL_EUR, '(para testar envio/recebimento)');
  console.log('  URL:  http://localhost:3002/auth/login');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
