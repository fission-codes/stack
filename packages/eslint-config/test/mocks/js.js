import 'eslint'
import fs from 'node:fs'
import path from 'path'
import * as c from '../../src/configs/ts.js'
import * as a from '../../src/index.js'

console.warn(path, fs, c, a)

const o = ['sss', 'sss']

const obj = {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
}

export { o, obj }
