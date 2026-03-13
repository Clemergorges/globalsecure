import crypto from 'crypto';
import { ensureRedisConnected, redis } from '@/lib/redis';

type IdempotencyStored =
  | {
      state: 'in_progress';
      requestHash: string;
      startedAt: number;
    }
  | {
      state: 'done';
      requestHash: string;
      status: number;
      body: unknown;
      completedAt: number;
    };

export type IdempotencyBeginResult =
  | { kind: 'skip' }
  | { kind: 'replay'; status: number; body: unknown }
  | { kind: 'in_progress' }
  | { kind: 'conflict' }
  | { kind: 'proceed'; commit: (out: { status: number; body: unknown }) => Promise<void>; rollback: () => Promise<void> };

export function readIdempotencyKey(headers: Headers) {
  const key = headers.get('idempotency-key') ?? headers.get('x-idempotency-key');
  if (!key) return null;
  const trimmed = key.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function hashIdempotencyPayload(payload: unknown) {
  const json = JSON.stringify(payload);
  return crypto.createHash('sha256').update(json).digest('hex');
}

function makeRedisKey(scope: string, key: string) {
  return `idem:${scope}:${key}`;
}

export async function beginIdempotency(params: {
  scope: string;
  key: string;
  requestHash: string;
  ttlSeconds?: number;
}) : Promise<IdempotencyBeginResult> {
  const ttlSeconds = params.ttlSeconds ?? 24 * 60 * 60;
  const redisKey = makeRedisKey(params.scope, params.key);

  try {
    if (!redis.isOpen) {
      const ok = await ensureRedisConnected();
      if (!ok) return { kind: 'skip' };
    }

    const existingRaw = await redis.get(redisKey);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as IdempotencyStored;
      if (existing.requestHash !== params.requestHash) return { kind: 'conflict' };
      if (existing.state === 'done') return { kind: 'replay', status: existing.status, body: existing.body };
      return { kind: 'in_progress' };
    }

    const inProgress: IdempotencyStored = {
      state: 'in_progress',
      requestHash: params.requestHash,
      startedAt: Date.now(),
    };

    const claimed = await redis.set(redisKey, JSON.stringify(inProgress), {
      NX: true,
      EX: Math.min(120, ttlSeconds),
    });

    if (!claimed) {
      const racedRaw = await redis.get(redisKey);
      if (!racedRaw) return { kind: 'in_progress' };
      const raced = JSON.parse(racedRaw) as IdempotencyStored;
      if (raced.requestHash !== params.requestHash) return { kind: 'conflict' };
      if (raced.state === 'done') return { kind: 'replay', status: raced.status, body: raced.body };
      return { kind: 'in_progress' };
    }

    return {
      kind: 'proceed',
      commit: async (out) => {
        const stored: IdempotencyStored = {
          state: 'done',
          requestHash: params.requestHash,
          status: out.status,
          body: out.body,
          completedAt: Date.now(),
        };
        await redis.set(redisKey, JSON.stringify(stored), { EX: ttlSeconds });
      },
      rollback: async () => {
        await redis.del(redisKey);
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('The client is closed') || msg.includes('client is closed')) {
      return { kind: 'skip' };
    }
    return { kind: 'skip' };
  }
}

