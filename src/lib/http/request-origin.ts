function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  const u = new URL(trimmed);
  const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (isLocal && u.port && u.port !== '3000') {
    return `${u.protocol}//${u.hostname}:3000`;
  }
  return `${u.protocol}//${u.host}`;
}

export function inferRequestOrigin(headers: Headers): string | null {
  const origin = headers.get('origin');
  if (origin) {
    try {
      return normalizeOrigin(origin);
    } catch {
      return origin;
    }
  }

  const rawProto = headers.get('x-forwarded-proto') || headers.get('x-forwarded-protocol');
  const rawHost = headers.get('x-forwarded-host') || headers.get('host');

  const proto = rawProto ? rawProto.split(',')[0].trim() : null;
  const host = rawHost ? rawHost.split(',')[0].trim() : null;
  if (!host) return null;

  const scheme = proto || 'http';
  try {
    return normalizeOrigin(`${scheme}://${host}`);
  } catch {
    return `${scheme}://${host}`;
  }
}

export function resolveBaseUrl(req: Request, opts?: { allowLocalhostFallback?: boolean }): string {
  const allowLocalhostFallback = opts?.allowLocalhostFallback ?? true;
  const configured = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || '').trim();
  if (configured) {
    return normalizeOrigin(configured).replace(/\/+$/, '');
  }

  const inferred = inferRequestOrigin(req.headers);
  if (inferred) return inferred.replace(/\/+$/, '');

  if (allowLocalhostFallback) return 'http://localhost:3000';
  throw new Error('BASE_URL_UNRESOLVED');
}
