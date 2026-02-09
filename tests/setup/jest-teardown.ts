/**
 * Jest Global Teardown
 * Runs ONCE after all tests
 */

import { cleanupTestDatabase } from './test-database';

export default async function globalTeardown() {
    console.log('\n🧹 Cleaning up after tests...\n');

    // Cleanup test data
    await cleanupTestDatabase();

    console.log('\n✅ Global teardown complete\n');
}
