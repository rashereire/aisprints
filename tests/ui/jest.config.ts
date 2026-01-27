import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testTimeout: 30000, // 30 seconds for Selenium operations
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'QuizMaker UI Test Results',
        outputPath: 'reports/html-reports/test-results.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
  ],
  setupFilesAfterEnv: ['<rootDir>/src/base/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
