// Import route dynamically after mocks in each test to ensure proper mocking

// Use var to avoid TDZ with jest.mock hoisting
var mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
  },
};

const mockSendEmail = jest.fn();
const mockLogAudit = jest.fn();

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/services/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  templates: { passwordResetLink: (url: string) => `<a href="${url}">reset</a>` },
}));
jest.mock('@/lib/logger', () => ({
  logAudit: (...args: any[]) => mockLogAudit(...args),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(async () => ({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 })),
}));

describe('Auth: Forgot password flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
    delete process.env.APP_BASE_URL;
  });

  test('returns 200 when SMTP not configured (generic message, logs)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
    const { POST: forgotPOST } = await import('@/app/api/auth/forgot-password/route');
    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com' }),
    });
    const res = await forgotPOST(req as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalled();
  });

  test('returns 200 when email send fails (generic message, logs)', async () => {
    process.env.SMTP_HOST = 'smtp.test.local';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.EMAIL_FROM = '"GlobalSecureSend" <noreply@globalsecuresend.com>';
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
    mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 'rt1' });
    mockSendEmail.mockResolvedValue({ ok: false, error: 'SMTP_SEND_FAILED' });

    const { POST: forgotPOST } = await import('@/app/api/auth/forgot-password/route');
    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com' }),
    });
    const res = await forgotPOST(req as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalled();
  });
});
