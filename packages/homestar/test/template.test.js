import { assert, suite } from 'playwright-test/taps'
import { parse } from '../src/workflow/template.js'

const test = suite('template')

test('should parse string', async function () {
  const context = {
    cid: 'bafy',
  }

  assert.equal(parse('hello {{ cid }}', context), 'hello bafy')
  assert.equal(parse('hello {{cid }}', context), 'hello bafy')
  assert.equal(parse('hello {{ cid}}', context), 'hello bafy')
  assert.equal(parse('hello {{cid}}', context), 'hello bafy')
})

test('should parse string with default', async function () {
  const context = {}

  assert.equal(parse('hello {{ cid:bafy }}', context), 'hello bafy')
  assert.equal(parse('hello {{cid:bafy }}', context), 'hello bafy')
  assert.equal(parse('hello {{ cid:bafy}}', context), 'hello bafy')
  assert.equal(parse('hello {{cid:bafy}}', context), 'hello bafy')
})

test('should parse string and replace stringified', async function () {
  const context = {
    cid: [1, 2],
    obj: { foo: 'bar' },
  }

  assert.equal(
    parse('hello {{ cid }} world {{obj}}', context),
    'hello [1,2] world {"foo":"bar"}'
  )
})

test('should parse object', async function () {
  const context = {
    cid: 'bafy',
  }

  assert.deepEqual(parse({ hello: 'hello {{ cid }}' }, context), {
    hello: 'hello bafy',
  })

  assert.deepEqual(parse({ hello: 'hello {{ foo:bar }}' }, context), {
    hello: 'hello bar',
  })
})

test('should parse object and replace with value', async function () {
  const context = {
    cid: [1, 2],
  }

  assert.deepEqual(parse({ hello: '{{ cid }}' }, context), {
    hello: [1, 2],
  })
})

test('should throws not found', async function () {
  const context = {}
  assert.throws(
    () => {
      parse({ hello: 'hello {{ needs.crop.output }}' }, context)
    },
    {
      name: 'Error',
      message: 'Could not find value for key "needs.crop.output" in context',
    }
  )
})

test('should throws not found on arrays', async function () {
  const context = {}
  assert.throws(
    () => {
      parse(['{{ needs.crop.output }}', 10], context)
    },
    {
      name: 'Error',
      message: 'Could not find value for key "needs.crop.output" in context',
    }
  )
})
