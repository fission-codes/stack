'use strict'

/** @type {import('eslint').Linter.BaseConfig} */
const config = {
  extends: [
    'standard',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:eslint-comments/recommended',
    'plugin:jsdoc/recommended-typescript-flavor',
    'plugin:unicorn/recommended',
  ],
  plugins: ['html', 'no-only-tests', 'jsdoc', 'unicorn'],
  reportUnusedDisableDirectives: true,
  env: {
    es2022: true,
    browser: true,
    node: true,
  },
  rules: {
    strict: ['error', 'safe'],
    curly: 'error',
    eqeqeq: ['error', 'smart'],
    'no-implicit-coercion': 'error',
    'no-nested-ternary': 'warn',
    'no-warning-comments': 'warn',
    'no-debugger': 'error',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-restricted-globals': [
      'error',
      { name: 'global', message: 'Use `globalThis` instead.' },
      { name: 'self', message: 'Use `globalThis` instead.' },
    ],
    'require-yield': 'error',
    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: false,
      },
    ],

    // plugins

    // eslint-comments
    'eslint-comments/disable-enable-pair': ['off'],

    // jsdoc - change also in ts.js
    'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
    'jsdoc/check-values': 'off',
    'jsdoc/check-tag-names': 'off',
    'jsdoc/no-undefined-types': 'off',
    'jsdoc/require-returns': 'off',
    'jsdoc/require-returns-type': 'off',
    'jsdoc/require-throws': 'off',
    'jsdoc/require-param-description': 'off',
    'jsdoc/require-returns-description': 'off',
    'jsdoc/valid-types': 'off',

    // no-only-tests
    'no-only-tests/no-only-tests': 'error',

    // unicorn
    'unicorn/prefer-node-protocol': 'off',
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/no-for-loop': 'off',

    // import
    'import/extensions': ['error', 'ignorePackages'],
    'import/order': 'error',
    'import/first': 'error',
    'import/no-mutable-exports': 'error',
    'import/newline-after-import': [
      'error',
      { count: 1, considerComments: true },
    ],
    'import/no-self-import': 'error',
    'import/namespace': ['error', { allowComputed: true }],
    'import/no-unresolved': 'off',
  },
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
  },
}

module.exports = config
