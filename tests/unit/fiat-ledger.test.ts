import { applyFiatMovement } from '@/lib/services/fiat-ledger';

function makeTx(overrides: any = {}) {
  return {
    fiatBalance: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    ...overrides,
  } as any;
}

describe('applyFiatMovement', () => {
  test('credits by upserting', async () => {
    const tx = makeTx();
    tx.fiatBalance.upsert.mockResolvedValue({ id: 'b1', amount: '10.00' });

    const r = await applyFiatMovement(tx, 'u1', 'EUR', 10);

    expect(tx.fiatBalance.upsert).toHaveBeenCalledTimes(1);
    expect(r.id).toBe('b1');
  });

  test('debit throws BALANCE_NOT_FOUND when row is missing', async () => {
    const tx = makeTx();
    tx.fiatBalance.updateMany.mockResolvedValue({ count: 0 });
    tx.fiatBalance.findUnique.mockResolvedValue(null);

    await expect(applyFiatMovement(tx, 'u1', 'EUR', -1)).rejects.toThrow('BALANCE_NOT_FOUND');
  });

  test('debit throws INSUFFICIENT_FUNDS when row exists but is not enough', async () => {
    const tx = makeTx();
    tx.fiatBalance.updateMany.mockResolvedValue({ count: 0 });
    tx.fiatBalance.findUnique.mockResolvedValue({ id: 'b1' });

    await expect(applyFiatMovement(tx, 'u1', 'EUR', -999)).rejects.toThrow('INSUFFICIENT_FUNDS');
  });

  test('debit returns updated row when update succeeds', async () => {
    const tx = makeTx();
    tx.fiatBalance.updateMany.mockResolvedValue({ count: 1 });
    tx.fiatBalance.findUnique.mockResolvedValue({ id: 'b1', amount: '9.00' });

    const r = await applyFiatMovement(tx, 'u1', 'EUR', -1);

    expect(r.amount).toBe('9.00');
  });
});
