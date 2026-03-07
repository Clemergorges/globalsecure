import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { deriveUserAddress } from '@/lib/services/polygon';

export async function GET() {
  const auth = await checkAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // deriveUserAddress checks DB first, generates if missing, and saves it.
    const address = await deriveUserAddress((auth as any).userId);
    
    return NextResponse.json({ 
      address,
      network: 'Polygon Amoy',
      token: 'USDT'
    });
  } catch (error) {
    console.error('Failed to get crypto address:', error);
    return NextResponse.json({ error: 'Failed to generate address' }, { status: 500 });
  }
}
