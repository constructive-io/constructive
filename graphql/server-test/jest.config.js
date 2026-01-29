module.exports = {
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
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  // Mock workspace packages that are only in server's dependencies
  moduleNameMapper: {
    '^graphile-settings$': '<rootDir>/__mocks__/graphile-settings.ts',
    '^pg-env$': '<rootDir>/__mocks__/pg-env.ts',
    '^postgraphile$': '<rootDir>/__mocks__/postgraphile.ts',
    '^postgraphile/presets/amber$': '<rootDir>/__mocks__/postgraphile-amber.ts',
    '^grafserv/express/v4$': '<rootDir>/__mocks__/grafserv.ts',
  },
};
