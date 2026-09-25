/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // A built package carries a copy of its own manifest, which jest's module map
  // reads as a second package of the same name.
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};
