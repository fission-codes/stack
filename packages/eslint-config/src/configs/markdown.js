'use strict'

const offRules = {
  'unicorn/no-process-exit': 'off',
  'jsdoc/require-jsdoc': 'off',
  'import/no-unresolved': 'off',
  'react/prop-types': 'off',
  'no-unused-vars': 'off',
  'no-undef': 'off',
  'no-console': 'off',
  'unicorn/filename-case': 'off',
}

exports.config = [
  {
    files: ['*.md'],
    extends: ['plugin:markdown/recommended'],
  },
  {
    files: ['**/*.md/*.*'],
    rules: offRules,
  },
  {
    files: ['**/*.md/*.ts', '**/*.md/*.tsx'],
    extends: [
      './configs/js',
      './configs/react',
      'plugin:@typescript-eslint/recommended',
      'prettier',
    ],
    rules: offRules,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
  },
]
