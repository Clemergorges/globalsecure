const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const email = (getArg('--email') || '').trim().toLowerCase();
const confirm = process.argv.includes('--confirm');

async function main() {
  if (!email) {
    console.error('Missing --email');
    process.exitCode = 2;
    return;
  }

  const prisma = new PrismaClient({ log: [] });
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { account: true }
    });

    if (!user) {
      console.log(JSON.stringify({ ok: false, error: 'USER_NOT_FOUND', email }, null, 2));
      process.exitCode = 1;
      return;
    }

    const before = {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      accountStatus: user.account?.status || null
    };

    console.log(JSON.stringify({ ok: true, before }, null, 2));

    if (!confirm) {
      console.log(JSON.stringify({ ok: false, error: 'Missing --confirm' }, null, 2));
      process.exitCode = 2;
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true }
      });

      if (user.account?.status === 'UNVERIFIED') {
        await tx.account.update({
          where: { id: user.account.id },
          data: { status: 'PENDING' }
        });
      }

      await tx.oTP.deleteMany({ where: { userId: user.id, type: 'EMAIL' } });
    });

    const afterUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { account: true }
    });

    const after = {
      userId: afterUser?.id,
      email: afterUser?.email,
      emailVerified: afterUser?.emailVerified,
      accountStatus: afterUser?.account?.status || null
    };

    console.log(JSON.stringify({ ok: true, after }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e?.message || String(e));
  process.exitCode = 1;
});

