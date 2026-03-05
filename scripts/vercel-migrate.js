const { spawnSync } = require('child_process');

function shouldRun() {
  if (process.env.RUN_DB_MIGRATIONS === 'true') return true;
  if (process.env.VERCEL === '1') return true;
  if (process.env.VERCEL_ENV) return true;
  return false;
}

function run() {
  if (!shouldRun()) {
    console.log('[vercel-migrate] Skipping prisma migrate deploy (not running on Vercel)');
    return;
  }

  console.log('[vercel-migrate] Running prisma migrate deploy...');
  const res = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (typeof res.status === 'number' && res.status !== 0) {
    process.exitCode = res.status;
  }
}

run();

