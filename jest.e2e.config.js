module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
        }],
    },
    testMatch: [
        '**/tests/e2e/**/*.test.ts',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/.next/',
    ],
    testTimeout: 60000,
    bail: 1, // Stop on first failure
    verbose: true,
}
