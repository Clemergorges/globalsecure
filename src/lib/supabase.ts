
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

let cachedSupabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (cachedSupabase) return cachedSupabase;
  const supabaseUrl = env.supabaseUrl() || 'https://example.supabase.co';
  const supabaseKey = env.supabaseServiceRoleKey() || 'example-service-role-key';
  cachedSupabase = createClient(supabaseUrl, supabaseKey);
  return cachedSupabase;
}

// Nome do bucket privado para KYC
export const KYC_BUCKET = 'kyc-documents';
