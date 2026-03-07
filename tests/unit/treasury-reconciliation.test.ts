const auditCreates: any[] = [];

const mockTx: any = {
  fiatBalance: {
    groupBy: jest.fn(),
  },
  treasurySnapshot: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn((args: any) => {
      auditCreates.push(args);
      return Promise.resolve(args);
    }),
  },
};

const mockPrisma: any = {
  $transaction: jest.fn(async (cb: any) => cb(mockTx)),
  treasurySnapshot: {
    create: mockTx.treasurySnapshot.create,
  },
};

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

import { runTreasuryReconciliation } from '@/lib/services/treasury-reconciliation';
import { Prisma } from '@prisma/client';

describe('Treasury reconciliation', () => {
  beforeEach(() => {
    auditCreates.length = 0;
    jest.clearAllMocks();
  });

  test('emits CRITICAL divergence audit when divergencePct >= critPct', async () => {
    mockTx.fiatBalance.groupBy.mockResolvedValue([{ currency: 'EUR', _sum: { amount: new Prisma.Decimal(1000) } }]);
    mockTx.treasurySnapshot.findMany.mockResolvedValue([{ provider: 'STRIPE', currency: 'EUR', balance: new Prisma.Decimal(900), capturedAt: new Date() }]);

    const r = await runTreasuryReconciliation({ warnPct: 1, critPct: 2, emitAudit: true, snapshotMaxAgeMinutes: 180 });
    const row = r.rows.find((x) => x.currency === 'EUR');
    expect(row).toBeTruthy();
    expect(row!.internalTotal).toBe('1000.00');
    expect(row!.externalTotal).toBe('900.00');

    const actions = auditCreates.map((c) => c.data.action);
    expect(actions).toContain('TREASURY_RECONCILIATION_DIVERGENCE');

    const divergence = auditCreates.find((c) => c.data.action === 'TREASURY_RECONCILIATION_DIVERGENCE');
    expect(divergence.data.status).toBe('CRITICAL');
    expect(divergence.data.metadata.currency).toBe('EUR');
  });

  test('emits missing snapshot audit when external snapshots are absent', async () => {
    mockTx.fiatBalance.groupBy.mockResolvedValue([{ currency: 'EUR', _sum: { amount: new Prisma.Decimal(123) } }]);
    mockTx.treasurySnapshot.findMany.mockResolvedValue([]);

    const r = await runTreasuryReconciliation({ warnPct: 1, critPct: 2, emitAudit: true, snapshotMaxAgeMinutes: 180 });
    const row = r.rows.find((x) => x.currency === 'EUR');
    expect(row).toBeTruthy();
    expect(row!.externalTotal).toBeNull();

    const actions = auditCreates.map((c) => c.data.action);
    expect(actions).toContain('TREASURY_RECONCILIATION_MISSING');
  });
});

