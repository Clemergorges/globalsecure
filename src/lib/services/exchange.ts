
import { getFxRate } from '@/lib/services/fx-engine';

export async function getExchangeRate(source: string, target: string): Promise<number> {
  if (source === target) return 1;

  // Normalizar para maiúsculo
  const from = source.toUpperCase();
  const to = target.toUpperCase();
  const fx = await getFxRate(from, to);
  return fx.rateApplied;
}

export async function calculateTransferAmounts(
  amountSource: number,
  currencySource: string,
  currencyTarget: string
) {
  const rate = await getExchangeRate(currencySource, currencyTarget);
  
  // Fee Logic
  // 1.8% Standard Fee
  const feePercentage = 0.018; 
  const fee = amountSource * feePercentage;
  
  const amountAfterFee = amountSource - fee;
  const amountReceived = amountAfterFee * rate;

  return {
    amountSent: amountSource,
    currencySent: currencySource,
    fee: parseFloat(fee.toFixed(2)),
    feePercentage: feePercentage * 100,
    rate,
    amountReceived: parseFloat(amountReceived.toFixed(2)),
    currencyReceived: currencyTarget
  };
}
