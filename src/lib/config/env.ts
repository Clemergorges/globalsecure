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

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(24).optional(),
  OTP_PEPPER: z.string().min(16).optional(),
  SENSITIVE_OTP_PEPPER: z.string().min(16).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  STRIPE_SECRET_KEY: z.string().min(20).optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function loadEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  cached = parsed.data;
  return cached;
}

function requireProdSecret(name: keyof Env) {
  const e = loadEnv();
  const raw = e[name];
  if (e.NODE_ENV !== 'production') return raw ?? '';
  if (!raw) throw new Error(`Missing env var: ${String(name)}`);
  if (isPlaceholder(raw)) throw new Error(`Invalid placeholder env var: ${String(name)}`);
  return raw;
}

export const env = {
  nodeEnv: () => loadEnv().NODE_ENV,
  jwtSecret: () => requireProdSecret('JWT_SECRET'),
  otpPepper: () => requireProdSecret('OTP_PEPPER'),
  sensitiveOtpPepper: () => requireProdSecret('SENSITIVE_OTP_PEPPER'),
  supabaseUrl: () => requireProdSecret('SUPABASE_URL'),
  supabaseServiceRoleKey: () => requireProdSecret('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecretKey: () => requireProdSecret('STRIPE_SECRET_KEY'),
};
