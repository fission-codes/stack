'use strict'

const assert = require('assert')
const path = require('path')
const eslint = require('eslint')

const cli = new eslint.ESLint({
  fix: false,
  cache: false,
  errorOnUnmatchedPattern: true,
})

/**
 *
 * @param {string} file - file path
 */
async function lint(file) {
  const lintResults = await cli.lintFiles(file)
  return lintResults[0]
}

const FIXTURES = path.resolve(__dirname, 'fixtures')
const p = (file) => path.resolve(FIXTURES, file)

describe('mjs', function () {
  it('support mjs', async () => {
    const report = await lint(p('invalid.mjs'))
    assert.ok(report.errorCount === 1)
    assert.ok(report.messages[0].ruleId === 'no-useless-constructor')
  })
})

describe('preact', function () {
  it('support mjs', async () => {
    const report = await lint(p('preact/invalid.jsx'))
    assert.ok(report.errorCount === 3)
    assert.ok(report.messages[0].ruleId === 'jsdoc/require-jsdoc')
    assert.ok(report.messages[1].ruleId === 'react/prop-types')
    assert.ok(report.messages[2].ruleId === 'react/self-closing-comp')
    assert.ok(report.messages[3].ruleId === 'react/jsx-no-target-blank')
  })
})
