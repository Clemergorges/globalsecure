
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transferId = 'cml9ijd70000213hoapcno2kt';
  console.log(`Checking card for transfer: ${transferId}`);

  const card = await prisma.virtualCard.findUnique({
    where: { transferId }
  });

  if (card) {
    console.log('✅ Card found in DB!');
    console.log(card);
  } else {
    console.log('❌ Card NOT found in DB.');
  }
  
  await prisma.$disconnect();
}

main();
