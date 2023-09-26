'use strict'

/** @type {import('eslint').Linter.Config} */
const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: true,
  },
  extends: [
    './js',
    'plugin:jsdoc/recommended-typescript',
    'standard-with-typescript',
  ],
  rules: {
    // import
    'import/extensions': ['error', 'never'],

    // jsdoc
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
  },
}

module.exports = config
