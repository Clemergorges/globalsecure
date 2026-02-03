import { NextResponse } from 'next/server';
import { calculateTransferAmounts } from '@/lib/services/exchange';

export async function POST(req: Request) {
  try {
    const { fromCurrency, toCurrency, amount } = await req.json();
    
    const calculation = await calculateTransferAmounts(
      Number(amount), 
      fromCurrency, 
      toCurrency
    );

    return NextResponse.json({
      fromCurrency,
      toCurrency,
      amountSource: calculation.amountSent,
      feeAmount: calculation.fee,
      feePercent: calculation.feePercentage,
      rate: calculation.exchangeRate,
      estimatedReceived: calculation.amountReceived,
      expiresAt: new Date(Date.now() + 60000) // 1 min validity
    });

  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Failed to get quote' }, { status: 500 });
  }
}
