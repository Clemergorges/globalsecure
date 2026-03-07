const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

// Explicitly load .env.test
const result = dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

if (result.error) {
    console.error('Error loading .env.test:', result.error);
} else {
    console.log('.env.test loaded successfully');
}

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Connected successfully!');
        
        const count = await prisma.user.count();
        console.log('User count:', count);
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

main();
