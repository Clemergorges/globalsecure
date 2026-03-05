import { NextResponse } from 'next/server';

export async function GET() {
  function parseUrl(raw: string) {
    if (!raw) return { present: false };
    try {
      const u = new URL(raw);
      return {
        present: true,
        protocol: u.protocol,
        host: u.hostname,
        port: u.port,
        database: u.pathname,
        search: u.search,
        hasSslModeRequire: u.searchParams.get('sslmode') === 'require',
        hasPgBouncer: u.searchParams.get('pgbouncer') === 'true',
      };
    } catch (e) {
      return { present: true, parseError: (e as Error).message, rawLength: raw.length };
    }
  }

  const db = parseUrl(process.env.DATABASE_URL || '');
  const direct = parseUrl(process.env.DIRECT_URL || '');
  const nodeEnv = process.env.NODE_ENV || 'unknown';
  const vercel = {
    env: process.env.VERCEL_ENV || undefined,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || undefined,
    region: process.env.VERCEL_REGION || undefined,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || undefined,
    gitRepoSlug: process.env.VERCEL_GIT_REPO_SLUG || undefined,
  };

  console.log('DB_HEALTH', { nodeEnv, vercel, db, direct });

  return NextResponse.json({ ok: true, nodeEnv, vercel, db, direct });
}
