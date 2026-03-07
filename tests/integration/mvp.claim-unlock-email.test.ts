import { prisma } from '../setup/prisma';

const mockGetSession = jest.fn();
const mockSendEmail = jest.fn();
const mockCardClaim = jest.fn();
const mockCardActivated = jest.fn();
const mockGetCardData = jest.fn();
const mockCheckRateLimit = jest.fn();

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/services/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  templates: {
    cardClaim: (...args: any[]) => mockCardClaim(...args),
    cardActivated: (...args: any[]) => mockCardActivated(...args),
  },
}));

jest.mock('@/lib/services/card', () => ({
  getCardData: (...args: any[]) => mockGetCardData(...args),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: any[]) => mockCheckRateLimit(...args),
}));

import { POST as claimLinksPost } from '@/app/api/claim-links/route';
import { POST as claimUnlockPost } from '@/app/api/claim/[token]/unlock/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('MVP Feb/2026: claim/unlock sends cardActivated with available amount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLAIM_LINKS_ENABLED = 'true';
    mockSendEmail.mockResolvedValue({ ok: true, messageId: 'm1' });
    mockCardClaim.mockReturnValue('<html>cardClaim</html>');
    mockCardActivated.mockReturnValue('<html>cardActivated</html>');
    mockGetCardData.mockResolvedValue({ pan: '4242 4242 4242 4242', cvv: '123', expMonth: 12, expYear: 2030 });
    mockCheckRateLimit.mockResolvedValue({ success: true, limit: 3, remaining: 2, reset: Date.now() + 60_000 });
  });

  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'mvp_claim_' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    await prisma.claimLink.deleteMany({ where: { creatorId: { in: ids } } });
    await prisma.virtualCard.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test('unlock sets unlockedAt, marks CLAIMED, and emails cardActivated with amountAvailable', async () => {
    const senderEmail = `${uid('mvp_claim_')}@test.com`;
    const sender = await prisma.user.create({
      data: {
        email: senderEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
      },
      select: { id: true },
    });

    mockGetSession.mockResolvedValue({ userId: sender.id, email: senderEmail, role: 'END_USER' });

    const createRes = await claimLinksPost(
      new Request('http://localhost/api/claim-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1', 'user-agent': 'jest-test-agent' },
        body: JSON.stringify({
          amount: 100,
          currency: 'EUR',
          message: 'hello',
          recipientEmail: 'recipient.claim@test.com',
          recipientName: 'Recipient',
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json();
    expect(createJson.success).toBe(true);
    expect(createJson.token).toBeTruthy();
    expect(createJson.unlockCode).toBeTruthy();

    await prisma.virtualCard.update({
      where: { id: createJson.cardId },
      data: { amountUsed: 12.34 },
    });

    const unlockRes = await claimUnlockPost(
      new Request(`http://localhost/api/claim/${createJson.token}/unlock`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
          'x-forwarded-proto': 'https',
          'user-agent': 'jest-test-agent',
        },
        body: JSON.stringify({ unlockCode: createJson.unlockCode }),
      }),
      { params: Promise.resolve({ token: createJson.token }) },
    );

    expect(unlockRes.status).toBe(200);
    const unlockJson = await unlockRes.json();
    expect(unlockJson.ok).toBe(true);

    const link = await prisma.claimLink.findUnique({ where: { token: createJson.token }, include: { virtualCard: true } });
    expect(link).toBeTruthy();
    expect(link!.status).toBe('CLAIMED');
    expect(link!.virtualCard?.unlockedAt).toBeTruthy();

    expect(mockCardActivated).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'EUR',
        amountAvailable: '87.66',
      }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient.claim@test.com',
        subject: 'Your GlobalSecure virtual card is active',
      }),
    );
  });
});
