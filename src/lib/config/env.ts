import { z } from 'zod';

function isPlaceholder(value: string) {
  const v = value.toLowerCase();
  return (
    v.includes('placeholder') ||
    v.includes('change-me') ||
    v.includes('change_me') ||
    v.includes('changeme') ||
    v.includes('mock') ||
    v === 'super-secret-jwt-key-change-me'
  );
}

const TEST_DEFAULT_JWT_SECRET = 'test-secret-key-for-ci-1234567890123456';
const TEST_DEFAULT_OTP_PEPPER = 'test-otp-pepper-1234';
const TEST_DEFAULT_SENSITIVE_OTP_PEPPER = 'test-sensitive-otp-pepper-1234';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().optional(),
  OTP_PEPPER: z.string().optional(),
  SENSITIVE_OTP_PEPPER: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function loadEnv(): Env {
  if (cached) return cached;
  const normalized: Record<string, unknown> = { ...process.env };
  for (const k of [
    'NODE_ENV',
    'JWT_SECRET',
    'OTP_PEPPER',
    'SENSITIVE_OTP_PEPPER',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
  ]) {
    if (normalized[k] === '') normalized[k] = undefined;
  }

  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  cached = parsed.data;
  return cached;
}

function requireProdSecret(name: keyof Env, minLen: number) {
  const e = loadEnv();
  const raw = e[name];
  if (e.NODE_ENV !== 'production') return raw ?? '';
  if (!raw) throw new Error(`Missing env var: ${String(name)}`);
  if (isPlaceholder(raw)) throw new Error(`Invalid placeholder env var: ${String(name)}`);
  if (raw.length < minLen) throw new Error(`Invalid env var length: ${String(name)}`);
  return raw;
}

function secretWithTestDefault(name: keyof Env, fallback: string, minLen: number) {
  const e = loadEnv();
  const raw = e[name];
  if (e.NODE_ENV === 'production') {
    if (!raw) throw new Error(`Missing env var: ${String(name)}`);
    if (isPlaceholder(raw)) throw new Error(`Invalid placeholder env var: ${String(name)}`);
    if (raw.length < minLen) throw new Error(`Invalid env var length: ${String(name)}`);
    return raw;
  }
  if (raw && raw.length >= minLen) return raw;
  return fallback;
}

export const env = {
  nodeEnv: () => loadEnv().NODE_ENV,
  jwtSecret: () => secretWithTestDefault('JWT_SECRET', TEST_DEFAULT_JWT_SECRET, 24),
  otpPepper: () => secretWithTestDefault('OTP_PEPPER', TEST_DEFAULT_OTP_PEPPER, 16),
  sensitiveOtpPepper: () => secretWithTestDefault('SENSITIVE_OTP_PEPPER', TEST_DEFAULT_SENSITIVE_OTP_PEPPER, 16),
  supabaseUrl: () => requireProdSecret('SUPABASE_URL', 1),
  supabaseServiceRoleKey: () => requireProdSecret('SUPABASE_SERVICE_ROLE_KEY', 20),
  stripeSecretKey: () => requireProdSecret('STRIPE_SECRET_KEY', 20),
};
