import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Webhook to receive deposit notifications from Alchemy/Infura
export async function POST(req: Request) {
  try {
    const bodyText = await req.text(); // Get raw body for HMAC
    const signature = req.headers.get('x-alchemy-signature'); // Verify specific header name
    const WEBHOOK_SECRET = process.env.ALCHEMY_WEBHOOK_SECRET;

    // 1. Validate HMAC Signature
    if (WEBHOOK_SECRET && signature) {
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        hmac.update(bodyText);
        const digest = hmac.digest('hex');
        
        if (signature !== digest) {
            console.error('Invalid Webhook Signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    } else {
        // Warn if running without security in dev
        console.warn('Skipping signature validation (Missing Secret or Header)');
    }

    const body = JSON.parse(bodyText);
    console.log('Received crypto webhook:', body);

    const { toAddress, value, hash, asset } = body; // Adjust based on provider payload structure
    console.log('Parsed data:', { toAddress, value, hash, asset });

    // 2. Process logic (Do not credit immediately!)
    // - Log the event to a 'WebhookEvent' table
    // - Trigger an async job to confirm transaction on-chain (wait for confirmations)
    // - Match 'toAddress' -> userId (via deterministic check or lookup table)

    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
