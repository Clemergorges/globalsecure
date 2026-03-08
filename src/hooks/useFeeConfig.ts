'use client';

import { useEffect, useState } from 'react';

export type FeeConfigSource = 'env' | 'db' | 'default';

export type FeeConfig = {
  remittance_fee_percent: number;
  fx_spread_percent: number;
  yield_apy_percent: number;
  last_updated: string;
  source: FeeConfigSource;
};

export const FALLBACK_CONFIG: FeeConfig = {
  remittance_fee_percent: 1.8,
  fx_spread_percent: 0.75,
  yield_apy_percent: 6.5,
  last_updated: 'fallback',
  source: 'default',
};

type FeeConfigState =
  | { loading: true; error: null; data: FeeConfig; isFallback: true }
  | { loading: false; error: null; data: FeeConfig; isFallback: boolean }
  | { loading: false; error: Error; data: FeeConfig; isFallback: true };

let cached: FeeConfig | null = null;
let inflight: Promise<FeeConfig> | null = null;

function logDevError(message: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, err);
  }
}

function asNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeConfig(raw: any): FeeConfig | null {
  const rem = asNumber(raw?.remittance_fee_percent);
  const fx = asNumber(raw?.fx_spread_percent);
  const y = asNumber(raw?.yield_apy_percent);
  const last = typeof raw?.last_updated === 'string' ? raw.last_updated : null;
  const source = raw?.source === 'env' || raw?.source === 'db' || raw?.source === 'default' ? (raw.source as FeeConfigSource) : null;

  if (rem === null || fx === null || y === null || !last || !source) return null;
  return {
    remittance_fee_percent: Math.min(Math.max(rem, 0), 100),
    fx_spread_percent: Math.min(Math.max(fx, 0), 100),
    yield_apy_percent: Math.min(Math.max(y, 0), 100),
    last_updated: last,
    source,
  };
}

async function fetchFeeConfig(): Promise<FeeConfig> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = fetch('/api/config/fees', { method: 'GET' })
    .then(async (r) => {
      const j = await r.json().catch(() => null);
      const normalized = normalizeConfig(j);
      if (!r.ok || !normalized) throw new Error('FEE_CONFIG_FETCH_FAILED');
      cached = normalized;
      return normalized;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useFeeConfig(): FeeConfigState {
  return useFeeConfigInternal(true);
}

export function useFeeConfigWithOptions(options?: { enabled?: boolean }): FeeConfigState {
  return useFeeConfigInternal(options?.enabled ?? true);
}

function useFeeConfigInternal(enabled: boolean): FeeConfigState {
  const [state, setState] = useState<FeeConfigState>({
    loading: true,
    error: null,
    data: FALLBACK_CONFIG,
    isFallback: true,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, error: null, data: FALLBACK_CONFIG, isFallback: true });
      return;
    }
    let mounted = true;

    fetchFeeConfig()
      .then((cfg) => {
        if (!mounted) return;
        setState({ loading: false, error: null, data: cfg, isFallback: false });
      })
      .catch((e) => {
        if (!mounted) return;
        logDevError('Failed to load fee config', e);
        setState({ loading: false, error: e instanceof Error ? e : new Error('FEE_CONFIG_FAILED'), data: FALLBACK_CONFIG, isFallback: true });
      });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  return state;
}

export function __resetFeeConfigCacheForTests() {
  cached = null;
  inflight = null;
}
