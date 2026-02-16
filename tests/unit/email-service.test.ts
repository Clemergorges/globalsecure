jest.mock('nodemailer', () => {
  const sendMail = jest.fn();
  const createTransport = jest.fn((_cfg: any) => ({ sendMail }));
  return {
    __esModule: true,
    default: { createTransport },
    __mock: { sendMail, createTransport },
  };
});

import { sendEmail } from '@/lib/services/email';

describe('Email service (SMTP env)', () => {
  const originalEnv = process.env;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const nodemailerMock = require('nodemailer').__mock as { sendMail: jest.Mock; createTransport: jest.Mock };
  const sendMail = nodemailerMock.sendMail;
  const createTransport = nodemailerMock.createTransport;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
  });

  afterAll(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('returns SMTP_NOT_CONFIGURED when env missing', async () => {
    const res = await sendEmail({ to: 'x@test.com', subject: 'sub', html: '<p>hi</p>' });
    expect(res.ok).toBe(false);
    expect((res as any).error).toBe('SMTP_NOT_CONFIGURED');
    expect(warnSpy).toHaveBeenCalledWith('[Email] SMTP not configured', { to: 'x@test.com', subject: 'sub' });
  });

  test('sends email when env present', async () => {
    process.env.SMTP_HOST = 'smtp.resend.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'resend';
    process.env.SMTP_PASS = 're_test';
    process.env.EMAIL_FROM = '"GlobalSecureSend" <noreply@globalsecuresend.com>';

    sendMail.mockResolvedValue({ messageId: 'm1' });

    const res = await sendEmail({ to: 'x@test.com', subject: 'sub', html: '<p>hi</p>' });
    expect(res.ok).toBe(true);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalledWith('[Email] SMTP not configured', expect.anything());
  });
});
