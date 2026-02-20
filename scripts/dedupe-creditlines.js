const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function score(line) {
  const collateralValueUsd = line.collateralValueUsd.toNumber();
  const collateralAmount = line.collateralAmount.toNumber();
  const ltvMax = line.ltvMax.toNumber();
  const ltvCurrent = line.ltvCurrent.toNumber();

  let s = 0;
  if (collateralValueUsd > 0) s += 1000;
  if (collateralAmount > 0) s += 500;
  if (ltvMax > 0) s += 200;
  if (ltvCurrent > 0) s += 100;
  if (line.status === 'ACTIVE') s += 50;
  s += Math.floor(line.updatedAt.getTime() / 1000) / 1e9;
  return s;
}

async function main() {
  const duplicates = await prisma.$queryRaw`
    SELECT "userId", COUNT(*)::bigint as c
    FROM "user_credit_lines"
    GROUP BY "userId"
    HAVING COUNT(*) > 1
    ORDER BY c DESC
  `;

  if (!duplicates.length) {
    console.log('No duplicate user_credit_lines found.');
    return;
  }

  console.log(`Found ${duplicates.length} userId(s) with duplicates.`);

  for (const row of duplicates) {
    const userId = row.userId;
    const lines = await prisma.userCreditLine.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (lines.length <= 1) continue;

    const ranked = lines
      .map((l) => ({ id: l.id, updatedAt: l.updatedAt, s: score(l) }))
      .sort((a, b) => b.s - a.s);

    const keepId = ranked[0].id;
    const deleteIds = ranked.slice(1).map((r) => r.id);

    await prisma.userCreditLine.deleteMany({ where: { id: { in: deleteIds } } });

    console.log(
      JSON.stringify(
        {
          userId,
          kept: keepId,
          deleted: deleteIds,
        },
        null,
        2,
      ),
    );
  }

  const remaining = await prisma.$queryRaw`
    SELECT "userId", COUNT(*)::bigint as c
    FROM "user_credit_lines"
    GROUP BY "userId"
    HAVING COUNT(*) > 1
    ORDER BY c DESC
  `;

  if (!remaining.length) {
    console.log('Deduplication complete: no remaining duplicates.');
  } else {
    console.log('Deduplication incomplete. Remaining duplicates:');
    console.log(remaining);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

