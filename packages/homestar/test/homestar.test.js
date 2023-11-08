/* eslint-disable unicorn/no-null */
import { assert, suite } from 'playwright-test/taps'
import { WebSocket } from 'unws'
import { base64 } from 'iso-base/rfc4648'
import pDefer from 'p-defer'
import { CID } from 'multiformats'
import { WebsocketTransport } from '../src/channel/transports/ws.js'
import { Homestar } from '../src/index.js'
import * as Workflow from '../src/workflow.js'

// eslint-disable-next-line no-unused-vars
import * as Schemas from '../src/schemas.js'

const test = suite('homestar').skip
const URL = 'ws://localhost:8060'

test('should fetch metrics from homestar', async function () {
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

test('should subs workflow', async function () {
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

  assert.ok(typeof result === 'string')

  const r = await prom.promise
  assert.equal(r.metadata.name, 'testtttt')
})

test(
  'should subs workflow for componentize',
  async function () {
    /** @type {import('p-defer').DeferredPromise<Schemas.WorkflowNotification>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(URL, {
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
/**
 *
 */
async function getImgBlob() {
  const resp = await fetch('/small.png')
  return resp.ok ? resp.blob() : Promise.reject(resp.status)
}

test(
  'should process base64 image',
  async function () {
    /** @type {import('p-defer').DeferredPromise<Schemas.WorkflowNotification>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(URL, {
        ws: WebSocket,
      }),
    })
    const img = await getImgBlob()
    const bmp = await createImageBitmap(img)
    // const { width, height } = bmp
    bmp.close() // free memory
    const dataUrl =
      'data:image/png;base64,' + base64.encode(await img.arrayBuffer())

    const workflow = await Workflow.workflow({
      name: 'crop-base64',
      workflow: {
        tasks: [
          Workflow.cropBase64({
            name: 'crop64',
            resource: 'ipfs://QmXne1sj1xsv8wPMxPHLjiEaLwNMPFQfdua3qK9j1rsPNg',
            args: {
              // @ts-ignore
              data: dataUrl,
              // sigma: 1.09,
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
      // console.log(
      //   '🚀 ~ file: homestar.test.js:190 ~ const{error,result}=awaiths.runWorkflow ~ data:',
      //   data
      // )
      // if (data.error) {
      //   return prom.reject(data.error)
      // }
      // prom.resolve(data.result)
    })

    if (error) {
      return assert.fail(error)
    }

    assert.ok(typeof result === 'string')

    await prom.promise
  },
  {
    timeout: 120_000,
  }
)

test(
  'should crop twice, receive 2 receipts and unsub',
  async function () {
    /** @type {import('p-defer').DeferredPromise<number>} */
    const prom = pDefer()
    const hs = new Homestar({
      transport: new WebsocketTransport(URL, {
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
            resource: 'ipfs://QmYtZSh2qzr8q7n6TMVDPpaecXKTjxQWBuj9n77Tccwcwp',
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
            resource: 'ipfs://QmYtZSh2qzr8q7n6TMVDPpaecXKTjxQWBuj9n77Tccwcwp',
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
