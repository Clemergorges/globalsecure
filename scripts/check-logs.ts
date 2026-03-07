
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Audit Logs...');
    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { email: true } } }
    });

    if (logs.length === 0) {
        console.log('No logs found!');
        return;
    }

    console.table(logs.map(l => ({
        Action: l.action,
        Status: l.status,
        User: l.user?.email,
        Path: l.path,
        Duration: `${l.duration}ms`
    })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
