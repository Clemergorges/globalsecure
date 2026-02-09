import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createVirtualCard } from '@/lib/services/stripe';
import { calculateTransferAmounts } from '@/lib/services/exchange';
import { pusherService } from '@/lib/services/pusher';

export async function POST(req: Request) {
  const session = await getSession();
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { 
      mode, 
      amountSource, 
      currencySource, 
      currencyTarget, 
      receiverEmail, 
      receiverName 
    } = body;

    // 0. KYC Check
    const user = await prisma.user.findUnique({ where: { id: (session as any).userId } });
    
    // Limits based on KYC Level
    // Level 0 (Unverified): Max 100 EUR
    // Level 1 (Pending): Max 500 EUR
    // Level 2 (Verified): Max 10,000 EUR
    
    const amount = Number(amountSource);
    const kycLevel = (user as any)?.kycLevel || 0;

    if (kycLevel === 0 && amount > 100) {
      return NextResponse.json({ error: 'Unverified account limit exceeded. Please complete KYC to send more than €100.' }, { status: 403 });
    }
    if (kycLevel === 1 && amount > 500) {
      return NextResponse.json({ error: 'Pending verification limit exceeded. Please wait for approval to send more than €500.' }, { status: 403 });
    }

    // 1. Calculate Amounts
    const calculation = await calculateTransferAmounts(
      Number(amountSource),
      currencySource,
      currencyTarget
    );

    // 2. Find Receiver if Account mode
    let receiverId = null;
    if (mode === 'ACCOUNT_CONTROLLED' && receiverEmail) {
      const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
      if (receiver) receiverId = receiver.id;
    }

    // 3. Create Transfer
    const transfer = await prisma.transfer.create({
      data: {
        senderId: (session as any).userId,
        recipientId: receiverId, // Correct field name
        recipientEmail: receiverEmail || 'unknown', // Required field
        recipientName: receiverName,
        // mode: mode, // Removed as per new schema
        type: mode === 'CARD_EMAIL' ? 'CARD' : 'ACCOUNT',
        amountSent: Number(amountSource), // Correct field name
        currencySent: currencySource,
        amountReceived: calculation.amountReceived, // Correct field name
        currencyReceived: currencyTarget,
        exchangeRate: calculation.exchangeRate,
        feePercentage: calculation.feePercentage,
        fee: calculation.fee, // Changed from feeAmount to fee
        status: 'PENDING', // Default valid status
        logs: {
          create: {
            type: 'CREATE_TRANSFER',
            metadata: { receiverEmail, receiverName }
          }
        }
      }
    });

    // 4. If Card Mode, create Virtual Card
    if (mode === 'CARD_EMAIL') {
      console.log('[Transfer] Mode is CARD_EMAIL. Initiating Stripe Card creation...');
      const supportedCurrencies = ['eur', 'usd', 'gbp'];
      let issueCurrency = currencyTarget.toLowerCase();
      let issueAmount = calculation.amountReceived;

      // Auto-convert to EUR (Stripe Issuing Native Currency) if currency not supported
      if (!supportedCurrencies.includes(issueCurrency)) {
         console.log(`[Transfer] Currency ${issueCurrency} not supported for card issuing. Converting to EUR.`);
         
         // Get rate from original currency to EUR
          const { getExchangeRate } = await import('@/lib/services/exchange');
          const exchangeData = await getExchangeRate(currencyTarget, 'EUR');
          const rateToEUR = exchangeData.rate;
          
          issueAmount = calculation.amountReceived * rateToEUR;
          issueCurrency = 'eur';
       } else {
         // Se a moeda já é suportada (ex: EUR), usamos o valor calculado diretamente.
         // Isso evita a dupla taxação/spread.
         issueAmount = calculation.amountReceived;
       }

      let cardData;
      try {
        cardData = await createVirtualCard({
          amount: Number(issueAmount),
          currency: issueCurrency,
          recipientEmail: receiverEmail,
          recipientName: receiverName,
          transferId: transfer.id
        });
        console.log('[Transfer] Stripe Card created successfully:', cardData.cardId);
      } catch (stripeError: any) {
        console.error('[Transfer] Stripe Card Creation Failed:', stripeError);
        // Clean up the transfer since card creation failed
        await prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'FAILED' } });
        throw new Error(`Stripe Issuing Failed: ${stripeError.message}`);
      }

      // Send Email with Card Details
      try {
        const { sendEmail, templates } = await import('@/lib/services/email');
        console.log('[Transfer] Sending email to:', receiverEmail);
        await sendEmail({
          to: receiverEmail,
          subject: '🎁 Você recebeu um Cartão Virtual GlobalSecure',
          html: templates.cardCreated(
            receiverName || 'Cliente',
            cardData.last4,
            Number(issueAmount).toFixed(2),
            issueCurrency.toUpperCase()
          )
        });
        console.log('[Transfer] Email sent successfully.');
      } catch (emailError) {
        console.error('[Transfer] Email sending failed (non-blocking):', emailError);
      }
      
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
          amount: calculation.amountReceived,
          currency: currencyTarget,
          status: 'ACTIVE' 
        }
      });
    }

    // 5. Notify Sender (Pusher + DB Notification)
    try {
      await pusherService.trigger(`user-${(session as any).userId}`, 'transfer-created', { transferId: transfer.id });
    } catch (pusherError) {
      console.warn('Pusher trigger failed:', pusherError);
    }
    
    // Create Persistent Notification
    try {
      const { createNotification } = await import('@/lib/notifications');
      await createNotification({
        userId: (session as any).userId,
        title: 'Transferência Enviada',
        body: `Você enviou ${currencySource} ${amountSource} para ${receiverName || receiverEmail}.`,
        type: 'SUCCESS'
      });
    } catch (notificationError) {
      console.warn('Notification creation failed:', notificationError);
    }

    return NextResponse.json({ success: true, transferId: transfer.id });
  } catch (error) {
    console.error('Transfer creation failed:', error);
    // @ts-ignore
    return NextResponse.json({ error: 'Transfer creation failed', details: error.message }, { status: 500 });
  }
}
