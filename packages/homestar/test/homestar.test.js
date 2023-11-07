/* eslint-disable unicorn/no-null */
import { assert, suite } from 'playwright-test/taps'
import { WebSocket } from 'unws'
import pDefer from 'p-defer'
import { WebsocketTransport } from '../src/channel/transports/ws.js'
import { Homestar } from '../src/index.js'

// eslint-disable-next-line no-unused-vars
import * as Schemas from '../src/schemas.js'

const test = suite('homestar')
const URL = 'ws://localhost:8060'

test.skip('should fetch metrics from homestar', async function () {
  const hs = new Homestar({
    transport: new WebsocketTransport(URL, {
      ws: WebSocket,
    }),
  })

  const { error, result } = await hs.metrics()
  if (error) {
    return assert.fail(error)
  }

  assert.equal(result.length, 17)
})

test.skip('should subs workflow', async function () {
  /** @type {import('p-defer').DeferredPromise<Schemas.WorkflowNotification>} */
  const prom = pDefer()
  const hs = new Homestar({
    transport: new WebsocketTransport(URL, {
      ws: WebSocket,
    }),
  })

  const workflow = {
    name: 'testtttt',
    workflow: {
      tasks: [
        {
          cause: null,
          meta: {
            memory: 4_294_967_296,
            time: 100_000,
          },
          prf: [],
          run: {
            input: {
              args: [
                {
                  '/': 'QmZ3VEcAWa2R7SQ7E1Y7Q5fL3Tzu8ijDrs3UkmF7KF2iXT',
                },
                150,
                350,
                500,
                500,
              ],
              func: 'crop',
            },
            nnc: '',
            op: 'wasm/run',
            rsc: 'ipfs://QmYtZSh2qzr8q7n6TMVDPpaecXKTjxQWBuj9n77Tccwcwp',
          },
        },
      ],
    },
  }

  const { error, result } = await hs.runWorkflow(workflow, (data) => {
    if (data.error) {
      return prom.reject(data.error)
    }
    prom.resolve(data.result)
  })

  if (error) {
    return assert.fail(error)
  }

  assert.ok(typeof result === 'number')

  const r = await prom.promise
  assert.equal(r.metadata.name, 'testtttt')
})
