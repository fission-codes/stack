'use strict'

/** @type {import('eslint').Linter.BaseConfig} */
const config = {
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  extends: [
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'react/display-name': [1, { ignoreTranspilerName: false }],
    'react/jsx-tag-spacing': [2, { beforeSelfClosing: 'always' }],
    'react/jsx-key': [2, { checkFragmentShorthand: true }],
    'react/jsx-no-bind': [
      1,
      {
        ignoreRefs: true,
        allowBind: false,
        allowFunctions: true,
        allowArrowFunctions: true,
      },
    ],
    'react/self-closing-comp': 2,
    'react/no-danger': 1,
    'react/prefer-es6-class': 2,
    'react/prefer-stateless-function': 1,
  },
}

module.exports = config
