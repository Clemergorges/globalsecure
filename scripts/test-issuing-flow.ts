
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
    console.log('⏳ Waiting 15 seconds for Webhook to process...');

    // Wait for webhook
    await new Promise(resolve => setTimeout(resolve, 15000));

    // 4. Verify DB
    const syncedCard = await prisma.virtualCard.findUnique({
      where: { stripeCardId: cardData.cardId }
    });

    if (syncedCard) {
      console.log('🎉 SUCCESS: Webhook successfully synced the card to DB!');
      console.log(syncedCard);
    } else {
      console.error('❌ FAILURE: Card was NOT found in DB. Webhook sync failed.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
