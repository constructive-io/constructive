// typebox 1.x ships only ES modules, and so does pi-ai (one test uses its
// argument validator). Jest runs this package as CommonJS, and its own
// require() of an ES module needs Node 24.9+ with --experimental-vm-modules,
// while CI runs Node 22, so those files are compiled to CommonJS here instead.
const ESM_ONLY = ['typebox', '@earendil-works/pi-ai'];
// Each package's folder, under node_modules or the pnpm store.
const esmOnlyDir = ESM_ONLY.map(
  (name) => `(?:\\.pnpm/${name.replace('/', '\\+')}@[^/]+/node_modules/)?${name}/`
).join('|');

// The seed time tests need a zone with an offset: UTC+7 all year. A test file
// can't set it, because jest gives each file a copy of process.env, so it is
// set here, before the workers start, for every test of the package.
process.env.TZ = 'Asia/Bangkok';

// Git in these tests reads no global or system config and takes no author from
// the environment, as on a CI runner, so a test sees the fallback identity and
// never the developer's. A test file can't set this for the git it runs
// through simple-git, which starts git with the environment of the process.
process.env.GIT_CONFIG_GLOBAL = '/dev/null';
process.env.GIT_CONFIG_NOSYSTEM = '1';
for (const key of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'EMAIL']) {
  delete process.env[key];
}

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        babelConfig: false,
        tsconfig: 'tsconfig.json'
      }
    ],
    [`/node_modules/(?:${esmOnlyDir}).+\\.m?js$`]: [
      'ts-jest',
      {
        babelConfig: false,
        tsconfig: { allowJs: true, module: 'commonjs', moduleResolution: 'node', isolatedModules: true }
      }
    ]
  },
  transformIgnorePatterns: [`/node_modules/(?!${esmOnlyDir})`],
  // structuredClone results in each test file's own realm (see the file).
  setupFiles: ['<rootDir>/jest.setup.js'],
  // node:test, which these tests were written for, has no default timeout, and
  // a few run past jest's 5 s: a command that ignores a stop is killed only
  // after its 5 s grace, and the template and dev server tests run real
  // processes.
  testTimeout: 60_000,
  testRegex: '(/__tests__/.*\\.(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['dist/*'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // pi-ai exports its modules under the `import` condition only, which a
    // CommonJS resolve doesn't match.
    '^@earendil-works/pi-ai/utils/(.*)$': '<rootDir>/node_modules/@earendil-works/pi-ai/dist/utils/$1.js'
  }
};
