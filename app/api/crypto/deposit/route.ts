import { NextResponse } from 'next/server';
import { deriveUserAddress } from '@/lib/services/polygon';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    // @ts-ignore
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // @ts-ignore
    const userId = session.userId;

    // Deterministic Address Generation
    // Now async and persists to DB
    const address = await deriveUserAddress(userId);
    
    const usdtContract = process.env.USDT_CONTRACT_ADDRESS || '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582';

    return NextResponse.json({
      address: address,
      network: 'POLYGON',
      token: 'USDT',
      // EIP-681 Format
      qrCode: `ethereum:${usdtContract}@80002/transfer?address=${address}`
    });
  } catch (error: any) {
    console.error('Crypto deposit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
