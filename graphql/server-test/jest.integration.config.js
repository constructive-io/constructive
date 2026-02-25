// Jest config for integration tests that require a deployed constructive-local database.
// Used by: pnpm test:integration (via __tests__/script/test-major-funcs.sh)
//
// This config includes ALL test files (no testPathIgnorePatterns) unlike the
// default jest.config.js which excludes integration tests for CI compatibility.

module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  forceExit: true,
};
