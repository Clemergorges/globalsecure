import { callPartnerWithBreaker, PartnerTemporarilyUnavailableError } from '@/lib/services/partner-circuit-breaker';

describe('partner-circuit-breaker', () => {
  const prev = process.env.DISABLE_EXTERNAL_SERVICES;
  const prevEnabled = process.env.PARTNER_BREAKER_ENABLED;

  afterEach(() => {
    process.env.DISABLE_EXTERNAL_SERVICES = prev;
    process.env.PARTNER_BREAKER_ENABLED = prevEnabled;
  });

  it('bypasses breaker when DISABLE_EXTERNAL_SERVICES=true', async () => {
    process.env.DISABLE_EXTERNAL_SERVICES = 'true';
    const out = await callPartnerWithBreaker('stripe', 'test', async () => 'ok');
    expect(out).toBe('ok');
  });

  it('bypasses breaker when PARTNER_BREAKER_ENABLED=false', async () => {
    process.env.PARTNER_BREAKER_ENABLED = 'false';
    const out = await callPartnerWithBreaker('polygon', 'test', async () => 123);
    expect(out).toBe(123);
  });

  it('exposes a consistent error code', () => {
    const e = new PartnerTemporarilyUnavailableError();
    expect(e.code).toBe('PARTNER_TEMPORARILY_UNAVAILABLE');
  });
});

