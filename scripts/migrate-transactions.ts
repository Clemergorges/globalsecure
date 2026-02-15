const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Transaction Migration (AccountTransaction -> UserTransaction)...');
  
  const walletTxs = await prisma.accountTransaction.findMany({
    include: { account: true }
  });

  console.log(`Found ${walletTxs.length} legacy transactions.`);

  let migrated = 0;
  let skipped = 0;

  for (const tx of walletTxs) {
    // Check duplication based on originalId in metadata
    // Note: Prisma JSON filter syntax might vary, using simple check logic if needed or just creating
    // We'll rely on a unique constraint if we had one, but we don't.
    // Let's just create if we don't find a matching one by timestamp + amount + userId roughly
    
    // Mapping types
    let newType = 'TRANSFER';
    if (tx.type === 'CREDIT') newType = 'DEPOSIT';
    if (tx.type === 'DEBIT') newType = 'TRANSFER';
    if (tx.type === 'FEE') newType = 'FEE';

    // Simple duplicate check
    const existing = await prisma.userTransaction.findFirst({
        where: { 
            userId: tx.account.userId,
            createdAt: tx.createdAt,
            amount: tx.amount
        }
    });

    if (!existing) {
        await prisma.userTransaction.create({
            data: {
                userId: tx.account.userId,
                accountId: tx.accountId,
                type: newType as any,
                amount: tx.amount,
                currency: tx.currency,
                status: 'COMPLETED',
                metadata: { 
                    originalId: tx.id, 
                    description: tx.description,
                    migrated: true 
                },
                createdAt: tx.createdAt
            }
        });
        migrated++;
    } else {
        skipped++;
    }
  }

  console.log(`✅ Migration Complete.`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });