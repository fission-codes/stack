/* eslint-disable unicorn/no-null */
import { assert, suite } from 'playwright-test/taps'
import * as Client from 'playwright-test/client'
import { WebSocket } from 'unws'
import pDefer from 'p-defer'
import { CID } from 'multiformats'
import { WebsocketTransport } from '../src/channel/transports/ws.js'
import { Homestar } from '../src/index.js'
import * as Workflow from '../src/workflow.js'

// eslint-disable-next-line no-unused-vars
import * as Schemas from '../src/schemas.js'
import { imageCID, wasmCID } from './fixtures.js'
import { getImgBlob } from './utils.js'

const test = suite('homestar').skip
const wsUrl = 'ws://localhost:8060'

test('should fetch metrics from homestar', async function () {
  const hs = new Homestar({
    transport: new WebsocketTransport(wsUrl, {
      ws: WebSocket,
    }),
  })

  const { error, result } = await hs.metrics()
  if (error) {
    return assert.fail(error)
  }

  assert.equal(result.length, 17)
})

test('should fetch health from homestar', async function () {
  const hs = new Homestar({
    transport: new WebsocketTransport(wsUrl, {
      ws: WebSocket,
    }),
  })

  const { error, result } = await hs.health()
  if (error) {
    return assert.fail(error)
  }

  assert.equal(result.healthy, true)
  assert.ok(result.nodeInfo)
  assert.ok(typeof result.nodeInfo.peer_id === 'string')
})

test('should subs workflow', async function () {
  /** @type {import('p-defer').DeferredPromise<Schemas.WorkflowNotification>} */
  const prom = pDefer()
  const hs = new Homestar({
    transport: new WebsocketTransport(wsUrl, {
      ws: WebSocket,
    }),
  })

  const workflow = await Workflow.workflow({
    name: 'subs',
    workflow: {
      tasks: [
        Workflow.crop({
          name: 'crop',
          resource: wasmCID,
          args: {
            data: CID.parse(imageCID),
            height: 100,
            width: 100,
            x: 150,
            y: 150,
          },
        }),
      ],
    },
  })

  const { error, result } = await hs.runWorkflow(workflow, (data) => {
    if (data.error) {
      return prom.reject(data.error)
    }
    prom.resolve(data.result)
  })

  if (error) {
    return assert.fail(error)
  }

  assert.ok(typeof result === 'string')

  const r = await prom.promise
  assert.equal(r.metadata.name, 'subs')
})

test(
  'should subs workflow for componentize',
  async function () {
    /** @type {import('p-defer').DeferredPromise<Schemas.WorkflowNotification>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })

    const workflow = {
      name: 'componentize',
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
                args: ['hugo'],
                func: 'hello',
              },
              nnc: '',
              op: 'wasm/run',
              rsc: 'ipfs://QmfCSBVVuDFEwe3R2BSBG5QpdLJ6ZwLnQLzg3xXAHZ4b2V',
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

    assert.ok(typeof result === 'string')

    const r = await prom.promise
    assert.equal(r.metadata.name, 'componentize')
  },
  { timeout: 60_000 }
)

test(
  'should process base64 image',
  async function () {
    /** @type {import('p-defer').DeferredPromise<Schemas.WorkflowNotification>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })
    const { dataUrl } = await getImgBlob()

    const workflow = await Workflow.workflow({
      name: 'crop-base64',
      workflow: {
        tasks: [
          Workflow.cropBase64({
            name: 'crop64',
            resource: wasmCID,
            args: {
              data: dataUrl,
              height: 10,
              width: 10,
              x: 1,
              y: 1,
            },
          }),
        ],
      },
    })

    const { error, result } = await hs.runWorkflow(workflow, (data) => {
      if (data.error) {
        return prom.reject(data.error)
      }
      prom.resolve(data.result)
    })

    if (error) {
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    const { receipt } = await prom.promise
    assert.equal(receipt.meta.op, 'crop-base64')

    const blob = new Blob([receipt.out[1]])
    const bmp = await createImageBitmap(blob)
    assert.equal(bmp.height, 10)
    assert.equal(bmp.width, 10)
  },
  {
    timeout: 30_000,
    skip: Client.mode === 'node',
  }
)

test(
  'should crop twice, receive 2 receipts and unsub',
  async function () {
    /** @type {import('p-defer').DeferredPromise<number>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })
    let count = 0

    const workflow = await Workflow.workflow({
      name: 'crop',
      workflow: {
        tasks: [
          Workflow.crop({
            name: 'crop',
            resource: wasmCID,
            args: {
              data: CID.parse('QmZ3VEcAWa2R7SQ7E1Y7Q5fL3Tzu8ijDrs3UkmF7KF2iXT'),
              height: 100,
              width: 100,
              x: 150,
              y: 150,
            },
          }),
          Workflow.crop({
            name: 'crop',
            resource: wasmCID,
            args: {
              data: CID.parse('QmZ3VEcAWa2R7SQ7E1Y7Q5fL3Tzu8ijDrs3UkmF7KF2iXT'),
              height: 10,
              width: 10,
              x: 150,
              y: 150,
            },
          }),
        ],
      },
    })

    const { error, result } = await hs.runWorkflow(workflow, (data) => {
      count++
      if (count === 2) {
        prom.resolve(2)
      }
    })

    if (error) {
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    await prom.promise
    assert.equal(count, 2)
  },
  {
    timeout: 120_000,
  }
)
