/** @type {import('ts-jest').JestConfigWithTsJest} */
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
    '^.+\\.mjs$': [
      'ts-jest',
      {
        babelConfig: false,
        tsconfig: {
          allowJs: true,
          module: 'commonjs',
        },
      },
    ],
  },
  // typebox ships ESM-only; transform it so the harness CJS build can load it
  transformIgnorePatterns: ['/node_modules/(?!.*typebox)'],
  testRegex: '(/__tests__/.*\\.(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
  modulePathIgnorePatterns: ['dist/*'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
