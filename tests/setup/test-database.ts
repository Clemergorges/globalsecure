/**
 * Test Database Setup
 * Uses DATABASE_URL from the test environment
 */

import { prisma } from './prisma';

/**
 * Setup test database
 * Creates necessary tables if they don't exist
 */
export async function setupTestDatabase() {
    try {
        // Test connection
        await prisma.$connect();
        console.log('✅ Test database connected');

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
        // Delete test users (emails starting with 'test_' or 'suite-')
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                OR: [
                    { email: { startsWith: 'test_' } },
                    { email: { startsWith: 'suite-' } }
                ]
            },
        });

        console.log(`✅ Cleaned up ${deletedUsers.count} test users`);

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
