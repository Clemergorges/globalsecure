const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('🔵 Testing DB Connection...');
    console.log(`URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')}`); // Hide password

    try {
        const count = await prisma.user.count();
        console.log(`✅ Connection Successful! Found ${count} users.`);
    } catch (error) {
        console.error('❌ Connection Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
