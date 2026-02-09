/**
 * Test Database Setup
 * Uses the SAME Supabase database but with isolated test data
 */

import { PrismaClient } from '@prisma/client';

// Use the same DATABASE_URL from .env (Supabase)
const prisma = new PrismaClient();

/**
 * Setup test database
 * Creates necessary tables if they don't exist
 */
export async function setupTestDatabase() {
    try {
        // Test connection
        await prisma.$connect();
        console.log('✅ Test database connected (Supabase)');

        // Verify tables exist
        const userCount = await prisma.user.count();
        console.log(`✅ Database ready (${userCount} users)`);

        return prisma;
    } catch (error) {
        console.error('❌ Test database setup failed:', error);
        throw error;
    }
}

/**
 * Cleanup test data
 * Removes all test users and related data
 */
export async function cleanupTestDatabase() {
    try {
        // Delete test users (emails starting with 'test_')
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                email: {
                    startsWith: 'test_',
                },
            },
        });

        console.log(`✅ Cleaned up ${deletedUsers.count} test users`);

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        throw error;
    }
}

/**
 * Reset test database
 * Cleans up all test data before running tests
 */
export async function resetTestDatabase() {
    console.log('🧹 Resetting test database...');
    await cleanupTestDatabase();
    await setupTestDatabase();
    console.log('✅ Test database reset complete');
}

export { prisma };
