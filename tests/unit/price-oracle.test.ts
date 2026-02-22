import { getConsolidatedPrice } from '@/lib/services/price-oracle';

describe('Price oracle', () => {
  beforeEach(() => {
    process.env.ORACLE_MAX_DIVERGENCE_BPS = '500';
    process.env.ORACLE_SINGLE_SOURCE_HAIRCUT_BPS = '500';
    process.env.ORACLE_TIMEOUT_MS = '2000';
    (global as any).fetch = jest.fn();
  });

  test('ambos retornam próximos -> divergence=false e média', async () => {
    (global as any).fetch.mockImplementation((url: string) => {
      if (url.includes('coingecko')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ethereum: { usd: 100 } }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ symbol: 'ETHUSDT', price: '101' }) });
    });

    const r = await getConsolidatedPrice('ETH');
    expect(r.divergence).toBe(false);
    expect(r.price).toBeCloseTo(100.5, 6);
    expect(r.sources.coingecko).toBe(100);
    expect(r.sources.binance).toBe(101);
  });

  test('diferença > 5% -> divergence=true', async () => {
    (global as any).fetch.mockImplementation((url: string) => {
      if (url.includes('coingecko')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ethereum: { usd: 100 } }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ symbol: 'ETHUSDT', price: '112' }) });
    });

    const r = await getConsolidatedPrice('ETH');
    expect(r.divergence).toBe(true);
    expect(r.price).toBeCloseTo(106, 6);
  });

  test('apenas um responde -> aplica haircut', async () => {
    (global as any).fetch.mockImplementation((url: string) => {
      if (url.includes('coingecko')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ symbol: 'ETHUSDT', price: '100' }) });
    });

    const r = await getConsolidatedPrice('ETH');
    expect(r.divergence).toBe(false);
    expect(r.price).toBeCloseTo(95, 6);
    expect(r.sources.coingecko).toBeNull();
    expect(r.sources.binance).toBe(100);
  });

  test('nenhum responde -> price=null', async () => {
    (global as any).fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    const r = await getConsolidatedPrice('ETH');
    expect(r.price).toBeNull();
    expect(r.divergence).toBe(false);
  });
});

