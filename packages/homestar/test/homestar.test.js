/* eslint-disable unicorn/no-null */
import { assert, suite } from 'playwright-test/taps'
import * as Client from 'playwright-test/client'
import { WebSocket } from 'unws'
import pDefer from 'p-defer'
import { WebsocketTransport } from '../src/channel/transports/ws.js'
import { Homestar } from '../src/index.js'
import * as Workflow from '../src/workflow/index.js'

// eslint-disable-next-line no-unused-vars
import * as Schemas from '../src/schemas.js'
import { addFileToIPFS, getImgBlob } from './utils.js'

const test = suite('homestar')
const wsUrl = 'ws://localhost:8060'

/**
 * @type {string}
 */
let wasmCID

/**
 * @type {import('multiformats').CID}
 */
let imageCID

test.before(async () => {
  // eslint-disable-next-line unicorn/no-await-expression-member
  wasmCID = (await addFileToIPFS('/example_test.wasm')).toString()
  imageCID = await addFileToIPFS('/logo.png')
})

test(
  'should fetch metrics from homestar',
  async function () {
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
    hs.close()
  },
  {
    timeout: 30_000,
  }
)

test(
  'should fetch health from homestar',
  async function () {
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
    assert.ok(typeof result.nodeInfo.static.peer_id === 'string')
    assert.ok(Array.isArray(result.nodeInfo.dynamic.listeners))
    hs.close()
  },
  {
    timeout: 30_000,
  }
)

test(
  'should subs workflow',
  async function () {
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
              data: imageCID,
              height: 100,
              width: 100,
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

    const r = await prom.promise
    assert.equal(r.metadata.name, 'subs')
    hs.close()
  },
  {
    timeout: 30_000,
  }
)

test.skip(
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
    hs.close()
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
    hs.close()
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
      name: 'crop-twice-unsub',
      workflow: {
        tasks: [
          Workflow.crop({
            name: 'crop1',
            resource: wasmCID,
            args: {
              data: imageCID,
              height: 100,
              width: 100,
              x: 150,
              y: 150,
            },
          }),
          Workflow.crop({
            name: 'crop2',
            resource: wasmCID,
            args: {
              data: imageCID,
              height: 10,
              width: 100,
              x: 1,
              y: 1,
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
    hs.close()
  },
  {
    timeout: 30_000,
  }
)

test(
  'should run workflow with deps',
  async function () {
    /** @type {import('p-defer').DeferredPromise<number>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })
    let count = 0
    const { dataUrl } = await getImgBlob()
    const workflow = await Workflow.workflow({
      name: 'test-template',
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
          Workflow.blur({
            name: 'blur',
            needs: 'crop64',
            resource: wasmCID,
            args: {
              sigma: 0.1,
              data: '{{needs.crop64.output}}',
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
      hs.close()
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    await prom.promise
    assert.equal(count, 2)
    hs.close()
  },
  {
    timeout: 30_000,
    skip: Client.mode === 'node',
  }
)

test(
  'should run workflow with multiple deps',
  async function () {
    /** @type {import('p-defer').DeferredPromise<string>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })
    let count = 0
    const workflow = await Workflow.workflow({
      name: 'test-template-multiple',
      workflow: {
        tasks: [
          Workflow.appendString({
            name: 'append',
            resource: wasmCID,
            args: {
              a: 'hello1111',
            },
          }),
          Workflow.joinStrings({
            name: 'append1',
            resource: wasmCID,
            args: {
              a: '{{needs.append.output}}',
              b: '111111',
            },
          }),
          Workflow.joinStrings({
            name: 'append2',
            resource: wasmCID,
            args: {
              a: '{{needs.append.output}}',
              b: '2222111',
            },
          }),
          Workflow.joinStrings({
            name: 'join',
            needs: ['append1', 'append2'],
            resource: wasmCID,
            args: {
              a: '{{needs.append1.output}}',
              b: '{{needs.append2.output}}',
            },
          }),
        ],
      },
    })

    const { error, result } = await hs.runWorkflow(workflow, (data) => {
      count++
      if (count === 4) {
        prom.resolve(data.result?.receipt.out[1])
      }
    })

    if (error) {
      hs.close()
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    const r = await prom.promise
    assert.equal(count, 4)
    assert.equal(r, 'hello1111\nworld111111hello1111\nworld2222111')
    hs.close()
  },
  {
    timeout: 30_000,
  }
)

test(
  'should receive network events',
  async function () {
    /** @type {import('p-defer').DeferredPromise<any>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(wsUrl, {
        ws: WebSocket,
      }),
    })

    const hs1 = new Homestar({
      transport: new WebsocketTransport('ws://localhost:8070', {
        ws: WebSocket,
      }),
    })

    await hs1.networkEvents((result) => {
      if (result.error) {
        console.error(result.error)
      } else {
        count++
        if (count === 2) {
          prom.resolve(result.result)
        }
      }
    })

    let count = 0
    const workflow = await Workflow.workflow({
      name: 'test-network-events',
      workflow: {
        tasks: [
          Workflow.appendString({
            name: 'append',
            resource: wasmCID,
            args: {
              a: 'hello',
            },
          }),
          Workflow.joinStrings({
            name: 'append1',
            resource: wasmCID,
            args: {
              a: '{{needs.append.output}}',
              b: '1',
            },
          }),
          // Workflow.joinStrings({
          //   name: 'append2',
          //   resource: wasmCID,
          //   args: {
          //     a: '{{needs.append.output}}',
          //     b: '2',
          //   },
          // }),
          // Workflow.joinStrings({
          //   name: 'join',
          //   needs: ['append1', 'append2'],
          //   resource: wasmCID,
          //   args: {
          //     a: '{{needs.append1.output}}',
          //     b: '{{needs.append2.output}}',
          //   },
          // }),
        ],
      },
    })

    const { error, result } = await hs.runWorkflow(workflow)

    if (error) {
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    await prom.promise
    assert.equal(count, 2)
    hs.close()
  },
  {
    timeout: 30_000,
  }
)
