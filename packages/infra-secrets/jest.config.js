/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  forceExit: true,
  preset: 'ts-jest',
  testEnvironment: 'node',

  testMatch: ['**/?(*.)+(test|spec).{ts,tsx,js,jsx}'],

  testPathIgnorePatterns: ['/dist/', '\\.d\\.ts$'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  watchPathIgnorePatterns: ['/dist/'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
