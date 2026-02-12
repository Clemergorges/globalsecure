module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(jose|uuid)/)'
    ],
    testMatch: [
        '**/tests/**/*.test.ts',
        '**/smoke.test.js',
    ],
    transform: {
        '^.+\.(t|j)sx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            useESM: true,
        }],
    },
    testPathIgnorePatterns: [
        '/node_modules/',
        '/.next/',
    ],
    testTimeout: 30000,
}

