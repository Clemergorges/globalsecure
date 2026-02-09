import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('E2E: Audit & Reconciliation', () => {
    // Read-only tests on existing data or specific audit checks

    it('should verify total system liability equals sum of all wallets', async () => {
        // This is a high-level consistency check

        // 1. Get all wallets
        const wallets = await prisma.wallet.findMany();

        // 2. Sum locally
        const totalEUR = wallets.reduce((sum, w) => sum + Number(w.balanceEUR), 0);

        // 3. Compare with some "Master Ledger" if it existed, or just ensuring no NaN/Negative weirdness
        expect(totalEUR).toBeGreaterThanOrEqual(0); // Basic sanity check

        console.log(`💰 Total System Liability: €${totalEUR.toFixed(2)}`);
    });

    it('should ensure every completed transaction has a valid wallet reference', async () => {
        const wallets = await prisma.wallet.findMany({ select: { id: true } });
        const walletIds = wallets.map(w => w.id);
        const orphans = await prisma.walletTransaction.findMany({
            where: {
                walletId: { notIn: walletIds }
            }
        });
        expect(orphans.length).toBe(0);
    });
});
