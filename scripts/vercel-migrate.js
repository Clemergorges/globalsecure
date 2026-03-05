const { spawnSync } = require('child_process');

function shouldRun() {
  return process.env.RUN_DB_MIGRATIONS === 'true';
}

function run() {
  if (!shouldRun()) {
    console.log('[vercel-migrate] Skipping prisma migrate deploy (RUN_DB_MIGRATIONS not enabled)');
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
