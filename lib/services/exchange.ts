interface ExchangeRateData {
  rate: number;
  source: string;
  timestamp: Date;
  spreadPercentage: number;
}

interface TransferCalculation {
  amountSent: number;
  currencySent: string;
  fee: number;
  feePercentage: number;
  exchangeRate: number;
  amountReceived: number;
  currencyReceived: string;
  rateSource: string;
  breakdown: {
    original: number;
    afterFee: number;
    afterConversion: number;
  };
}

/**
 * Obtém taxa de câmbio com spread de 1.8%
 */
export async function getExchangeRate(
  from: string,
  to: string
): Promise<ExchangeRateData> {
  try {
    // Usando exchangerate-api.com (gratuita)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      { next: { revalidate: 60 } } // Cache por 1 minuto
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();
    const baseRate = data.rates[to];

    if (!baseRate) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }

    // Aplicar spread de 1.8%
    const spreadPercentage = 1.8;
    const rateWithSpread = baseRate * (1 - spreadPercentage / 100);

    return {
      rate: rateWithSpread,
      source: 'exchangerate-api',
      timestamp: new Date(),
      spreadPercentage
    };
  } catch (error) {
    console.error('Exchange Rate Error:', error);
    throw error;
  }
}

/**
 * Calcula valores completos de uma transferência
 */
export async function calculateTransferAmounts(
  amountSent: number,
  currencySent: string,
  currencyReceived: string
): Promise<TransferCalculation> {
  const feePercentage = 1.8;
  const fee = amountSent * (feePercentage / 100);
  const amountAfterFee = amountSent - fee;

  let exchangeRate = 1;
  let amountReceived = amountAfterFee;
  let rateSource = 'SAME_CURRENCY';

  // Se moedas diferentes, converter
  if (currencySent !== currencyReceived) {
    const exchangeData = await getExchangeRate(currencySent, currencyReceived);
    exchangeRate = exchangeData.rate;
    amountReceived = amountAfterFee * exchangeRate;
    rateSource = exchangeData.source;
  }

  return {
    amountSent,
    currencySent,
    fee,
    feePercentage,
    exchangeRate,
    amountReceived,
    currencyReceived,
    rateSource,
    breakdown: {
      original: amountSent,
      afterFee: amountAfterFee,
      afterConversion: amountReceived
    }
  };
}
