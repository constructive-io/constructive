// Each integration test file gets its own isolated database cloned from a
// template built once (lazily) via pg_dump from the live constructive DB.
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
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  // First integration test creates the template DB via pg_dump (~30s),
  // subsequent tests clone instantly. 60s covers both cases.
  testTimeout: 60000,
  // Force exit after tests complete - PostGraphile v5's internal pools
  // may not fully release before Jest's timeout
  forceExit: true,
};
