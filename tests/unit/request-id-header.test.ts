import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  logAudit: jest.fn(async () => {}),
}));

jest.mock('@/lib/auth', () => ({
  extractUserId: jest.fn(async () => null),
}));

import { createHandler } from '@/lib/api-handler';

describe('createHandler attaches x-request-id', () => {
  test('propagates request id from request headers', async () => {
    const handler = createHandler(undefined, async () => NextResponse.json({ ok: true }), { requireAuth: false });

    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-request-id': 'rid_test' },
      body: JSON.stringify({}),
    });

    const res = await handler(req as any);
    expect(res.headers.get('x-request-id')).toBe('rid_test');
  });

  test('still sets x-request-id when missing', async () => {
    const handler = createHandler(undefined, async () => NextResponse.json({ ok: true }), { requireAuth: false });

    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await handler(req as any);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });
});

