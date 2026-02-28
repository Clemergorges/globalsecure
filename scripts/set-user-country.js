const path = require('path');
const base = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(base, '.env') });
require('dotenv').config({ path: path.join(base, '.env.local'), override: true });

const { PrismaClient } = require('@prisma/client');

async function main() {
  const email = process.argv[2];
  const country = process.argv[3];
  if (!email || !country) {
    console.log('Usage: node scripts/set-user-country.js <email> <country>');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  await prisma.user.update({
    where: { email },
    data: { country: String(country).trim().toUpperCase() },
    select: { id: true },
  });
  await prisma.$disconnect();
  console.log('OK');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
