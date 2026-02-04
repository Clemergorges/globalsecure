import { NextResponse } from 'next/server';
import { deriveUserAddress, getUserBalanceUsdt } from '@/lib/services/polygon';
// import { auth } from '@/auth'; // Assuming auth helper exists

export async function POST(req: Request) {
  try {
    // Security: Validate User Session
    // const session = await auth();
    // if (!session || !session.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // const userId = session.user.id;
    
    const { userId } = await req.json(); // For MVP/Test only. In prod use session.user.id

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Deterministic Address Generation
    // Ensures the same userId always gets the same address index
    const address = deriveUserAddress(userId);

    return NextResponse.json({
      address: address,
      network: 'POLYGON',
      token: 'USDT',
      qrCode: `ethereum:0xc2132D05D31c914a87C6611C10748AEb04B58e8F@137/transfer?address=${address}&uint256=0`
    });
  } catch (error: any) {
    console.error('Crypto deposit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
