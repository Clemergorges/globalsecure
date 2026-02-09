/**
 * Jest Global Setup
 * Runs ONCE before all tests
 */

import { setupTestDatabase, resetTestDatabase } from './test-database';

export default async function globalSetup() {
    console.log('\n🚀 Starting test suite...\n');

    // Setup and reset database
    await resetTestDatabase();

    console.log('\n✅ Global setup complete\n');
}
