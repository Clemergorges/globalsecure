const mockGetFxRate = jest.fn();

jest.mock('@/lib/services/fx-engine', () => ({
  getFxRate: (...args: unknown[]) => mockGetFxRate(...args),
}));

import { calculateTransferAmounts } from '@/lib/services/exchange';

describe('Fee model (transfers/create)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockGetFxRate.mockResolvedValue({ rateApplied: 2 });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('EXPLICIT: user pays amount + fee, recipient receives full amount * rate', async () => {
    process.env = { ...process.env, NODE_ENV: 'development', FEE_MODEL_TRANSFERS_CREATE: 'EXPLICIT' };

    const r = await calculateTransferAmounts(100, 'EUR', 'USD');
    expect(r.fee).toBe(1.8);
    expect(r.totalToPay).toBe(101.8);
    expect(r.amountReceived).toBe(200);
    expect(r.feeModel).toBe('EXPLICIT');
  });

  test('NET: user pays amount, fee is deducted before FX', async () => {
    process.env = { ...process.env, NODE_ENV: 'development', FEE_MODEL_TRANSFERS_CREATE: 'NET' };

    const r = await calculateTransferAmounts(100, 'EUR', 'USD');
    expect(r.fee).toBe(1.8);
    expect(r.totalToPay).toBe(100);
    expect(r.amountReceived).toBe(196.4);
    expect(r.feeModel).toBe('NET');
  });

  test('default: NET in test, EXPLICIT otherwise', async () => {
    process.env = { ...process.env, FEE_MODEL_TRANSFERS_CREATE: '' };

    process.env = { ...process.env, NODE_ENV: 'test' };
    const a = await calculateTransferAmounts(100, 'EUR', 'USD');
    expect(a.feeModel).toBe('NET');

    process.env = { ...process.env, NODE_ENV: 'production' };
    const b = await calculateTransferAmounts(100, 'EUR', 'USD');
    expect(b.feeModel).toBe('EXPLICIT');
  });
});
