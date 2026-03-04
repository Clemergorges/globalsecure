import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.DATABASE_URL || '';

  let parsed: any = {};
  try {
    const u = new URL(raw);
    parsed = {
      protocol: u.protocol,
      username: u.username,
      host: u.hostname,
      port: u.port,
      database: u.pathname,
    };
  } catch (e) {
    parsed = { parseError: (e as Error).message, rawLength: raw.length };
  }

  console.log('DB_HEALTH', parsed);

  return NextResponse.json({ ok: true, db: parsed });
}
