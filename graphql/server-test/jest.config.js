// Integration test files that require a deployed constructive-local database.
// These are excluded from the default `pnpm test` (CI) and run via
// `pnpm test:integration` which sets up the database first.
const INTEGRATION_TESTS = [
  'authentication',
  'users-profiles',
  'databases-schemas',
  'tables-fields',
  'views-policies-constraints',
  'module-configuration',
  'organizations',
  'memberships-invites',
  'permissions-grants',
  'sites-apis',
].join('|');

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
  testPathIgnorePatterns: [
    '/node_modules/',
    `__tests__/(${INTEGRATION_TESTS})\\.test\\.ts$`,
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  // Force exit after tests complete - PostGraphile v5's internal pools
  // may not fully release before Jest's timeout
  forceExit: true,
};
