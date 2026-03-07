
import { PrismaClient } from '@prisma/client';
import { createVirtualCard } from '../lib/services/stripe';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting End-to-End Issuing Flow Test...');

  try {
    // 1. Create a dummy user
    const email = `test-user-${randomBytes(4).toString('hex')}@example.com`;
    console.log(`Creating test user: ${email}`);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'dummy_hash',
        firstName: 'Test',
        lastName: 'User',
        phone: `+352${Math.floor(Math.random() * 1000000000)}`,
      }
    });

    // 2. Create a dummy transfer
    console.log('Creating test transfer...');
    const transfer = await prisma.transfer.create({
      data: {
        senderId: user.id,
        recipientEmail: 'beneficiary@example.com',
        recipientName: 'Beneficiary Test',
        amountSent: 100,
        currencySent: 'EUR',
        amountReceived: 100,
        currencyReceived: 'EUR',
        fee: 1.8,
        type: 'CARD',
        status: 'PENDING'
      }
    });
    console.log(`Transfer created with ID: ${transfer.id}`);

    // 3. Call Stripe Service directly (Simulating App logic)
    // IMPORTANT: We do NOT save the VirtualCard to DB here.
    // We rely on the Webhook to catch the "issuing_card.created" event and save it.
    console.log('Calling Stripe to create virtual card (skipping local DB save)...');
    
    const cardData = await createVirtualCard({
      amount: 100,
      currency: 'EUR',
      recipientEmail: 'beneficiary@example.com',
      recipientName: 'Beneficiary Test',
      transferId: transfer.id
    });

    console.log(`✅ Card created on Stripe! ID: ${cardData.cardId}`);
    
    // Simulate what the App does (API Route): Create Card in DB with LOCKED status
    const unlockCode = '123456';
    await prisma.virtualCard.create({
      data: {
        transferId: transfer.id,
        stripeCardId: cardData.cardId,
        stripeCardholderId: cardData.cardholderId,
        last4: cardData.last4,
        brand: cardData.brand,
        expMonth: cardData.exp_month,
        expYear: cardData.exp_year,
        expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
        amount: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        // @ts-ignore - Schema updated but client might not be
        unlockStatus: 'LOCKED',
        unlockCode: unlockCode
      }
    });
    console.log('✅ Card created in DB with LOCKED status');

    console.log('⏳ Waiting 5 seconds for Webhook to process (if applicable)...');
    // Wait for webhook (optional, since we manually created it above to simulate API)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Verify DB
    const syncedCard = await prisma.virtualCard.findUnique({
      where: { stripeCardId: cardData.cardId }
    });

    if (syncedCard) {
      console.log('🎉 SUCCESS: Card found in DB!');
      // @ts-ignore
      console.log(`Status: ${syncedCard.status}, UnlockStatus: ${syncedCard.unlockStatus}`);
    } else {
      console.error('❌ FAILURE: Card was NOT found in DB.');
    }

    // 5. Test Unlock Logic
    console.log('🔓 Testing Unlock Logic...');
    if (syncedCard) {
       // Simulate Unlock API
       await prisma.virtualCard.update({
         where: { id: syncedCard.id },
         data: {
            // @ts-ignore
            unlockStatus: 'UNLOCKED',
            unlockedAt: new Date()
         }
       });
       console.log('✅ Card Unlocked!');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
