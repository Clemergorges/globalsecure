
// Exchange Service - Real-time Rates via CoinGecko
// Stage: MVP (Uses CoinGecko Public API)
// Future: Migrate to Paid API (Stripe/Fixer) for high volume

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Map our currency codes to CoinGecko IDs
const CURRENCY_MAP: Record<string, string> = {
  'EUR': 'eur',
  'USD': 'usd',
  'BRL': 'brl',
  'USDT': 'tether',
  'GBP': 'gbp',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'MATIC': 'matic-network'
};

// Fallback rates in case API fails (Circuit Breaker)
const FALLBACK_RATES: Record<string, number> = {
  'EUR:USD': 1.05,
  'USD:EUR': 0.95,
  'EUR:BRL': 6.00,
  'BRL:EUR': 0.16,
  'EUR:USDT': 1.05, 
  'USDT:EUR': 0.95
};

export async function getExchangeRate(source: string, target: string): Promise<number> {
  if (source === target) return 1;

  // Normalizar para maiúsculo
  const from = source.toUpperCase();
  const to = target.toUpperCase();
  const key = `${from}:${to}`;

  // 1. Tentar API Real
  try {
    const fromId = CURRENCY_MAP[from];
    const toId = CURRENCY_MAP[to];

    if (fromId && toId) {
      // CoinGecko retorna preços baseados em USD ou moeda vs moeda
      // Ex: ?ids=bitcoin&vs_currencies=usd
      const response = await fetch(`${COINGECKO_API}?ids=${fromId}&vs_currencies=${toId.toLowerCase()}`, {
        next: { revalidate: 60 } // Cache por 60 segundos para não estourar limite
      });

      if (response.ok) {
        const data = await response.json();
        const rate = data[fromId]?.[toId.toLowerCase()];
        
        if (rate) {
           console.log(`[Exchange] Real-time rate fetched for ${key}: ${rate}`);
           return rate;
        }
      }
    }
  } catch (error) {
    console.error(`[Exchange] API Error for ${key}:`, error);
  }

  // 2. Fallback Seguro (Se API falhar)
  console.warn(`[Exchange] Using fallback rate for ${key}`);
  const fallback = FALLBACK_RATES[key];
  if (fallback) return fallback;

  // 3. Fallback Reverso (Se tivermos USD:EUR mas quisermos EUR:USD)
  const reverseKey = `${to}:${from}`;
  if (FALLBACK_RATES[reverseKey]) {
      return 1 / FALLBACK_RATES[reverseKey];
  }

  // 4. Último Recurso (1:1) - Perigoso, mas evita crash
  console.error(`[Exchange] CRITICAL: No rate found for ${key}. Using 1:1.`);
  return 1;
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
