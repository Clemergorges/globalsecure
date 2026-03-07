import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

const mockGetSession = jest.fn();
const mockTrigger = jest.fn();
const mockCreateVirtualCard = jest.fn();
const mockSendEmail = jest.fn();
const mockCardCreatedTemplate = jest.fn();

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/services/pusher', () => ({
  pusherService: { trigger: (...args: any[]) => mockTrigger(...args) },
}));

jest.mock('@/lib/services/issuer-connector', () => ({
  getIssuerConnector: () => ({
    kind: 'MOCK',
    createVirtualCard: (...args: any[]) => mockCreateVirtualCard(...args),
  }),
}));

jest.mock('@/lib/services/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  templates: {
    cardCreated: (...args: any[]) => mockCardCreatedTemplate(...args),
  },
}));

import { POST as transfersCreatePost } from '@/app/api/transfers/create/route';
import { GET as cardEmailGet } from '@/app/api/card/email/[token]/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('MVP Feb/2026: public card email view (Scenario B)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ ok: true, messageId: 'm1' });
    mockCardCreatedTemplate.mockReturnValue('<html>cardCreated</html>');
    mockCreateVirtualCard.mockResolvedValue({
      cardId: `ic_test_${Date.now()}`,
      cardholderId: `ich_test_${Date.now()}`,
      last4: '4242',
      brand: 'visa',
      exp_month: 12,
      exp_year: 2030,
    });
  });

  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'mvp_card_email_view_' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    await prisma.transactionLog.deleteMany({ where: { transfer: { senderId: { in: ids } } } });
    await prisma.spendTransaction.deleteMany({ where: { card: { userId: { in: ids } } } });
    await prisma.claimLink.deleteMany({ where: { creatorId: { in: ids } } });
    await prisma.virtualCard.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: ids } } } });
    await prisma.fiatBalance.deleteMany({ where: { userId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test('token válido retorna saldos e gastos aprovados (amountAvailable = amountInitial - amountUsed)', async () => {
    const email = `${uid('mvp_card_email_view_')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.create({
      data: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(1000) },
    });

    mockGetSession.mockResolvedValue({
      userId: user.id,
      email,
      role: 'END_USER',
      sessionId: 'sess_test',
      isAdmin: false,
    });

    const res = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'jest-test-agent',
        },
        body: JSON.stringify({
          mode: 'CARD_EMAIL',
          amountSource: 100,
          currencySource: 'EUR',
          currencyTarget: 'EUR',
          receiverEmail: 'recipient@test.com',
          receiverName: 'Recipient',
          personalMessage: 'hello',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const transferId = json.transferId as string;
    expect(transferId).toBeTruthy();

    const card = await prisma.virtualCard.findUnique({ where: { transferId } });
    expect(card).toBeTruthy();

    const link = await prisma.claimLink.findUnique({ where: { virtualCardId: card!.id } });
    expect(link?.token).toBeTruthy();

    await prisma.spendTransaction.createMany({
      data: [
        {
          cardId: card!.id,
          stripeAuthId: uid('auth'),
          amount: new Prisma.Decimal(10),
          currency: 'EUR',
          merchantName: 'Coffee Shop',
          status: 'approved',
        },
        {
          cardId: card!.id,
          stripeAuthId: uid('auth'),
          amount: new Prisma.Decimal(5.5),
          currency: 'EUR',
          merchantName: 'Book Store',
          status: 'approved',
        },
        {
          cardId: card!.id,
          stripeAuthId: uid('auth'),
          amount: new Prisma.Decimal(3),
          currency: 'EUR',
          merchantName: 'Should Not Appear',
          status: 'declined',
        },
      ],
    });

    await prisma.virtualCard.update({
      where: { id: card!.id },
      data: { amountUsed: new Prisma.Decimal(15.5) },
    });

    const r = await cardEmailGet(new Request('http://localhost/api/card/email/t', { method: 'GET' }), {
      params: Promise.resolve({ token: link!.token }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.currency).toBe('EUR');
    expect(body.amountInitial).toBeCloseTo(98.2, 2);
    expect(body.amountUsed).toBeCloseTo(15.5, 2);
    expect(body.amountAvailable).toBeCloseTo(82.7, 2);
    expect(body.transactions.length).toBe(2);
    expect(body.transactions.map((x: any) => x.merchant)).toEqual(expect.arrayContaining(['Coffee Shop', 'Book Store']));
  });

  test('token inválido retorna CARD_LINK_INVALID sem vazar detalhes', async () => {
    const r = await cardEmailGet(new Request('http://localhost/api/card/email/t', { method: 'GET' }), {
      params: Promise.resolve({ token: 'does_not_exist' }),
    });
    expect(r.status).toBe(404);
    const body = await r.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('CARD_LINK_INVALID');
  });
});
