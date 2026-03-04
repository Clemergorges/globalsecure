
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/jest.env.ts'],
    globalSetup: '<rootDir>/tests/jest.global-setup.ts',
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^next-intl$': '<rootDir>/tests/mocks/next-intl.ts',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(jose|uuid)/)'
    ],
    testMatch: [
        '**/tests/**/*.test.ts',
        '**/tests/**/*.test.tsx',
        '**/smoke.test.js',
    ],
    transform: {
        '^.+\\.(t|j)sx?$': ['ts-jest', {
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
