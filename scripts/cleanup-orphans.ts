
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up orphan WalletTransactions...');
    
    // Find orphans
    // Since we can't easily do "NOT IN" with Prisma fluent API easily for deleteMany without raw query usually,
    // but here we can try to use raw query for speed and correctness.
    
    try {
        // 1. Transactions orphans
        const count = await prisma.$executeRaw`
            DELETE FROM "WalletTransaction"
            WHERE "walletId" NOT IN (SELECT "id" FROM "Wallet");
        `;
        console.log(`Deleted ${count} orphan WalletTransactions.`);
        
        // 2. Balance orphans
        const countBalance = await prisma.$executeRaw`
            DELETE FROM "Balance"
            WHERE "walletId" NOT IN (SELECT "id" FROM "Wallet");
        `;
        console.log(`Deleted ${countBalance} orphan Balances.`);

        // 3. Transfer orphans (Sender)
        const countTransferSender = await prisma.$executeRaw`
            DELETE FROM "Transfer"
            WHERE "senderId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countTransferSender} orphan Transfers (Bad Sender).`);

        // 4. Transfer orphans (Recipient)
        const countTransferRecipient = await prisma.$executeRaw`
            DELETE FROM "Transfer"
            WHERE "recipientId" IS NOT NULL AND "recipientId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countTransferRecipient} orphan Transfers (Bad Recipient).`);

        // 5. VirtualCard orphans
        // transferId must exist in Transfer
        const countVirtualCard = await prisma.$executeRaw`
            DELETE FROM "VirtualCard"
            WHERE "transferId" NOT IN (SELECT "id" FROM "Transfer");
        `;
        console.log(`Deleted ${countVirtualCard} orphan VirtualCards.`);

        // 5.1 SpendTransaction orphans
        const countSpendTx = await prisma.$executeRaw`
            DELETE FROM "SpendTransaction"
            WHERE "cardId" NOT IN (SELECT "id" FROM "VirtualCard");
        `;
        console.log(`Deleted ${countSpendTx} orphan SpendTransactions.`);
        
        // 6. User orphans (Wallet references user)
        // Check if there are wallets pointing to non-existent users?
        const countWallet = await prisma.$executeRaw`
            DELETE FROM "Wallet"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countWallet} orphan Wallets.`);

        // 7. Session orphans
        const countSession = await prisma.$executeRaw`
            DELETE FROM "Session"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countSession} orphan Sessions.`);

        // 8. CryptoDeposit orphans
        const countCrypto = await prisma.$executeRaw`
            DELETE FROM "CryptoDeposit"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countCrypto} orphan CryptoDeposits.`);
        
        // 9. Notification orphans
        const countNotif = await prisma.$executeRaw`
            DELETE FROM "Notification"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countNotif} orphan Notifications.`);
        
        // 10. OTP orphans
        const countOTP = await prisma.$executeRaw`
            DELETE FROM "OTP"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countOTP} orphan OTPs.`);

        // 11. TopUp orphans
        const countTopUp = await prisma.$executeRaw`
            DELETE FROM "TopUp"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countTopUp} orphan TopUps.`);

        // 12. CryptoWithdraw orphans
        const countWithdraw = await prisma.$executeRaw`
            DELETE FROM "CryptoWithdraw"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countWithdraw} orphan CryptoWithdraws.`);

        // 13. Swap orphans
        const countSwap = await prisma.$executeRaw`
            DELETE FROM "Swap"
            WHERE "userId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countSwap} orphan Swaps.`);

        // 14. ClaimLink orphans
        const countClaim = await prisma.$executeRaw`
            DELETE FROM "ClaimLink"
            WHERE "creatorId" NOT IN (SELECT "id" FROM "User");
        `;
        console.log(`Deleted ${countClaim} orphan ClaimLinks.`);

    } catch (e) {
        console.error('Error cleaning orphans:', e);
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
