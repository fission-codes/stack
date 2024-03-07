import { assert, suite } from 'playwright-test/taps'
import { log } from '../src/logging.js'

const test = suite('homestar-wit logging')

test('should log', async function () {
  assert.doesNotThrow(() => {
    log('critical', 'test', 'message')
  })
})
