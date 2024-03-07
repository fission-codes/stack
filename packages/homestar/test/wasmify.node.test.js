import * as url from 'url'
import path from 'path'
import { assert, suite } from 'playwright-test/taps'
import pDefer from 'p-defer'
import { base64 } from 'iso-base/rfc4648'
import { utf8 } from 'iso-base/utf8'
import { temporaryDirectory } from 'tempy'
import { WebsocketTransport } from '@fission-codes/channel/transports/ws.js'
import { build } from '../src/wasmify/index.js'
import { Homestar } from '../src/index.js'
import { invocation, workflow } from '../src/workflow/index.js'
import { addFSFileToIPFS } from './utils-node.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const test = suite('wasmify')
const HS1_URL = process.env.HS1_URL || 'ws://localhost:8060'
const hs = new Homestar({
  transport: new WebsocketTransport(HS1_URL),
})

test.after(() => {
  hs.close()
})

test(
  'should wasmify',
  async function () {
    const { outPath } = await build(
      path.join(__dirname, 'fixtures', 'wasmify', 'hello.ts'),
      temporaryDirectory()
    )

    /** @type {import('p-defer').DeferredPromise<string>} */
    const prom = pDefer()

    const args = ['hello']

    const wasmCID = await addFSFileToIPFS(outPath)
    const workflow1 = await workflow({
      name: 'hash',
      workflow: {
        tasks: [
          invocation({
            name: 'hash',
            func: 'hash',
            args,
            resource: `ipfs://${wasmCID}`,
          }),
        ],
      },
    })
    const { error } = await hs.runWorkflow(workflow1, (data) => {
      prom.resolve(data.receipt.out[1])
    })

    if (error) {
      return assert.fail(error)
    }

    const r = await prom.promise
    const actual = utf8.encode(base64.decode(r))
    assert.equal(actual, 'hello')
  },
  {
    timeout: 30_000,
  }
)

test(
  'should wasmify with bytes',
  async function () {
    const { outPath } = await build(
      path.join(__dirname, 'fixtures', 'wasmify', 'hello.ts'),
      temporaryDirectory()
    )

    /** @type {import('p-defer').DeferredPromise<Uint8Array>} */
    const prom = pDefer()
    const args = ['aGVsbG8']

    const wasmCID = await addFSFileToIPFS(outPath)
    const workflow1 = await workflow({
      name: 'hash',
      workflow: {
        tasks: [
          invocation({
            name: 'hash',
            func: 'hashbytes',
            args,
            resource: `ipfs://${wasmCID}`,
          }),
        ],
      },
    })
    const { error } = await hs.runWorkflow(workflow1, (data) => {
      prom.resolve(data.receipt.out[1])
    })

    if (error) {
      return assert.fail(error)
    }

    const r = await prom.promise
    const actual = base64.encode(r)
    assert.equal(actual, 'aGVsbG8')
  },
  {
    timeout: 30_000,
  }
)

test(
  'should wasmify with wit logging',
  async function () {
    const { outPath } = await build(
      path.join(__dirname, 'fixtures', 'wasmify', 'wit-test.ts'),
      temporaryDirectory()
    )

    /** @type {import('p-defer').DeferredPromise<number>} */
    const prom = pDefer()
    const args = [1.1, 1.1]
    const wasmCID = await addFSFileToIPFS(outPath)
    const workflow1 = await workflow({
      name: 'hash',
      workflow: {
        tasks: [
          invocation({
            name: 'hash',
            func: 'subtract',
            args,
            resource: `ipfs://${wasmCID}`,
          }),
        ],
      },
    })

    const { error } = await hs.runWorkflow(workflow1, (data) => {
      prom.resolve(data.receipt.out[1])
    })

    if (error) {
      return assert.fail(error)
    }

    const r = await prom.promise
    assert.equal(r, 0)
  },
  {
    timeout: 120_000,
  }
)
