module.exports = {
  displayName: 'graphql-server-test-perf',
  testEnvironment: 'node',
  rootDir: '..',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
      },
    ],
  },
  testMatch: ['<rootDir>/perf/**/*.perf.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/perf/reports/'],
  collectCoverage: false,
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
};
