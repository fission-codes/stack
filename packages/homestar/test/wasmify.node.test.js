import * as url from 'url'
import path from 'path'
import { assert, suite } from 'playwright-test/taps'
import pDefer from 'p-defer'
import { base32hex, base64 } from 'iso-base/rfc4648'
import { utf8 } from 'iso-base/utf8'
import { randomBytes } from 'iso-base/crypto'
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
const outDir = temporaryDirectory()

test.after(() => {
  hs.close()
})

test(
  'should wasmify',
  async function () {
    const { outPath } = await build({
      entryPoint: path.join(__dirname, 'fixtures', 'wasmify', 'hello.ts'),
      outDir,
    })

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
    const { outPath } = await build({
      entryPoint: path.join(__dirname, 'fixtures', 'wasmify', 'hello.ts'),
      outDir,
    })

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
    const { outPath } = await build({
      entryPoint: path.join(__dirname, 'fixtures', 'wasmify', 'wit-test.ts'),
      outDir,
    })

    /** @type {import('p-defer').DeferredPromise<number>} */
    const prom = pDefer()
    const args = [1, 1]
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

test(
  'should wasmify with multiple tasks and nonce',
  async function () {
    const { outPath } = await build({
      entryPoint: path.join(__dirname, 'fixtures', 'wasmify', 'hello.ts'),
      outDir,
    })

    /** @type {import('p-defer').DeferredPromise<string>} */
    const prom = pDefer()

    const args = ['hello', 1]

    const wasmCID = await addFSFileToIPFS(outPath)
    const workflow1 = await workflow({
      name: 'sum',
      workflow: {
        tasks: [
          invocation({
            name: 'sum1',
            func: 'sum',
            args,
            resource: `ipfs://${wasmCID}`,
            nnc: base32hex.encode(randomBytes(12), false),
          }),
          invocation({
            name: 'sum2',
            func: 'sum',
            args: ['{{needs.sum1.output}}', 2],
            resource: `ipfs://${wasmCID}`,
            nnc: base32hex.encode(randomBytes(12), false),
          }),
        ],
      },
    })

    /**
     * @type {number}
     */
    let count = 0
    const { error } = await hs.runWorkflow(workflow1, (data) => {
      count++

      if (count === 2) {
        prom.resolve(data.receipt.out[1])
      }
    })

    if (error) {
      return assert.fail(error)
    }

    const r = await prom.promise
    assert.equal(r, 'hello12')
  },
  {
    timeout: 30_000,
  }
)
