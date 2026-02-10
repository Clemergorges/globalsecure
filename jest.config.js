module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: [
        '**/tests/**/*.test.ts',
        '**/smoke.test.js',
    ],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
        }],
    },
    testPathIgnorePatterns: [
        '/node_modules/',
        '/.next/',
    ],
    testTimeout: 30000,
}

