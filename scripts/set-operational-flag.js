const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const key = process.argv[2];
  const enabledRaw = process.argv[3];
  const enabled = enabledRaw === 'true' || enabledRaw === '1';

  if (!key) {
    throw new Error('MISSING_KEY');
  }

  await prisma.operationalFlag.upsert({
    where: { key },
    create: { key, enabled, reason: enabled ? 'MANUAL_TEST' : null },
    update: { enabled, reason: enabled ? 'MANUAL_TEST' : null },
  });

  console.log(`OK ${key}=${enabled}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

