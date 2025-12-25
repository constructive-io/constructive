const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  eslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      '!eslint.config.js'
    ]
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Symbol: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        queueMicrotask: 'readonly',
        structuredClone: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports
    },
    rules: {
      // TypeScript strict rules
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true
      }],

      // Style rules - strict enforcement
      'indent': ['error', 2, {
        SwitchCase: 1,
        VariableDeclarator: 1,
        outerIIFEBody: 1,
        MemberExpression: 1,
        FunctionDeclaration: { parameters: 1, body: 1 },
        FunctionExpression: { parameters: 1, body: 1 },
        CallExpression: { arguments: 1 },
        ArrayExpression: 1,
        ObjectExpression: 1,
        ImportDeclaration: 1,
        flatTernaryExpressions: false,
        ignoreComments: false
      }],
      'quotes': ['error', 'single', {
        avoidEscape: true,
        allowTemplateLiterals: true
      }],
      'semi': ['error', 'always'],
      'semi-spacing': ['error', { before: false, after: true }],
      'semi-style': ['error', 'last'],
      'comma-dangle': ['error', 'never'],
      'comma-spacing': ['error', { before: false, after: true }],
      'comma-style': ['error', 'last'],
      'quote-props': ['error', 'as-needed'],

      // Spacing rules
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'no-whitespace-before-property': 'error',
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', { words: true, nonwords: false }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'arrow-spacing': ['error', { before: true, after: true }],
      'block-spacing': ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'computed-property-spacing': ['error', 'never'],
      'func-call-spacing': ['error', 'never'],
      'template-curly-spacing': ['error', 'never'],
      'rest-spread-spacing': ['error', 'never'],
      'switch-colon-spacing': ['error', { after: true, before: false }],

      // Brace and block rules
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'curly': ['error', 'multi-line', 'consistent'],
      'nonblock-statement-body-position': ['error', 'beside'],

      // Line rules
      'eol-last': ['error', 'always'],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      'linebreak-style': ['error', 'unix'],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] }
      ],

      // Best practices
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-template': 'error',
      'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'object-shorthand': ['error', 'always', { avoidQuotes: true }],
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-lonely-if': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      'no-await-in-loop': 'warn',
      'require-await': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-async-promise-executor': 'error',
      'no-promise-executor-return': 'error',
      'prefer-promise-reject-errors': 'error',

      // Error prevention
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unreachable-loop': 'error',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error', {
        functions: false,
        classes: true,
        variables: true
      }],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error', {
        ignoreTypeValueShadow: true,
        ignoreFunctionTypeParameterNameValueShadow: true
      }],

      // Switch statements
      'default-case': 'warn',
      'default-case-last': 'error',
      'no-fallthrough': 'error',

      // Console and debugging
      'no-console': 'off',
      'no-debugger': 'error',
      'no-alert': 'error',

      // Import sorting
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',

      // Disabled rules that conflict with TypeScript or are too strict
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      'no-dupe-class-members': 'off',
      '@typescript-eslint/no-dupe-class-members': 'error',
      'no-case-declarations': 'off',
      'no-implicit-globals': 'off'
    }
  },
  prettierConfig
];
