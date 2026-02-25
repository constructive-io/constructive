// Integration test files that require a deployed constructive-local database.
// Controlled by RUN_INTEGRATION env var:
//   pnpm test                         → unit tests only (CI default)
//   RUN_INTEGRATION=true pnpm test    → all tests including integration
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

const ignorePatterns = ['/node_modules/'];

if (!process.env.RUN_INTEGRATION) {
  ignorePatterns.push(`__tests__/(${INTEGRATION_TESTS})\\.test\\.ts$`);
}

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
  testPathIgnorePatterns: ignorePatterns,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  // Force exit after tests complete - PostGraphile v5's internal pools
  // may not fully release before Jest's timeout
  forceExit: true,
};
