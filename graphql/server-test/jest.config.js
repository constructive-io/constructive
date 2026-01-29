// Base configuration shared by all test types
const baseConfig = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
        isolatedModules: true, // Skip type checking for faster tests
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
};

// Mocks for unit tests (not used in E2E integration tests)
const unitTestMocks = {
  '^graphile-settings$': '<rootDir>/__mocks__/graphile-settings.ts',
  '^pg-env$': '<rootDir>/__mocks__/pg-env.ts',
  '^postgraphile$': '<rootDir>/__mocks__/postgraphile.ts',
  '^postgraphile/presets/amber$': '<rootDir>/__mocks__/postgraphile-amber.ts',
  '^grafserv/express/v4$': '<rootDir>/__mocks__/grafserv.ts',
};

module.exports = {
  projects: [
    // Unit tests - use mocks for external packages
    {
      ...baseConfig,
      displayName: 'unit',
      testMatch: [
        '**/__tests__/**/*.test.ts',
        '!**/__tests__/**/*.integration.test.ts',
      ],
      moduleNameMapper: unitTestMocks,
    },
    // Integration tests - use real packages (no mocks)
    {
      ...baseConfig,
      displayName: 'integration',
      testMatch: ['**/__tests__/**/*.integration.test.ts'],
      // Explicitly disable mocking for integration tests
      automock: false,
      // No moduleNameMapper - use real packages
      // But we need to tell Jest NOT to use __mocks__ directories
      modulePathIgnorePatterns: ['<rootDir>/__mocks__/'],
    },
  ],
};
