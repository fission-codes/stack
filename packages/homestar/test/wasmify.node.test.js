import * as url from 'url'
import path from 'path'
import { assert, suite } from 'playwright-test/taps'
import { WebSocket } from 'unws'
import pDefer from 'p-defer'
import { base64 } from 'iso-base/rfc4648'
import { utf8 } from 'iso-base/utf8'
import { temporaryDirectory } from 'tempy'
import { build } from '../src/wasmify/index.js'
import { Homestar } from '../src/index.js'
import { WebsocketTransport } from '../src/channel/transports/ws.js'
import { invocation, workflow } from '../src/workflow/index.js'
import { addFSFileToIPFS } from './utils.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const test = suite('wasmify').skip
const wsUrl = process.env.HS1_URL || 'ws://localhost:8060'

test(
  'should wasmify',
  async function () {
    const { outPath } = await build(
      path.join(__dirname, 'fixtures', 'wasmify', 'hello.ts'),
      temporaryDirectory()
    )

    /** @type {import('p-defer').DeferredPromise<string>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })

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
    const { error, result } = await hs.runWorkflow(workflow1, (data) => {
      if (data.error) {
        return prom.reject(data.error)
      }
      prom.resolve(data.result?.receipt.out[1])
    })

    if (error) {
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    const r = await prom.promise
    const actual = utf8.encode(base64.decode(r))
    assert.equal(actual, 'hello')
    hs.close()
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
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })

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
    const { error, result } = await hs.runWorkflow(workflow1, (data) => {
      if (data.error) {
        return prom.reject(data.error)
      }
      prom.resolve(data.result?.receipt.out[1])
    })

    if (error) {
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    const r = await prom.promise
    const actual = base64.encode(r)
    assert.equal(actual, 'aGVsbG8')
    hs.close()
  },
  {
    timeout: 30_000,
  }
)
