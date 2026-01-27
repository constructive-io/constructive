/** @type {import('ts-jest').JestConfigWithTsJest} */

// Set environment variables for tests
// simpleInflection is required because ORM code in @constructive-io/graphql-server
// was generated with this feature enabled
process.env.FEATURES_SIMPLE_INFLECTION = 'true';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        babelConfig: false,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: [`/node_modules/*`],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['dist/*']
};
