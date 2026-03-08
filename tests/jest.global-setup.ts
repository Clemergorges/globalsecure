import { execSync } from 'node:child_process';

export default async function globalSetup() {
  const nodeEnv = process.env.NODE_ENV || 'test';
  const databaseUrl = process.env.DATABASE_URL || '';
  if (!process.env.DIRECT_URL && databaseUrl) {
    process.env.DIRECT_URL = databaseUrl;
  }
  if (nodeEnv !== 'test') return;
  if (!databaseUrl) return;
  const isLocal =
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl.includes('globalsecure_test');
  if (!isLocal) return;

  execSync('npx prisma db push --schema prisma/schema.prisma --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  });
}
