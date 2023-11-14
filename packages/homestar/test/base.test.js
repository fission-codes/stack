import { assert, suite } from 'playwright-test/taps'
import { WebSocket } from 'unws'
import pDefer from 'p-defer'
import { Channel } from '../src/channel/index.js'
import { JsonRpcCodec } from '../src/channel/codecs/jsonrpc.js'
import { WebsocketTransport } from '../src/channel/transports/ws.js'

const test = suite('channel')
const URL = 'ws://localhost:8082'

test('should echo and match correct request', async function () {
  const codec = new JsonRpcCodec()
  const channel = new Channel({
    codec,
    transport: new WebsocketTransport(URL + '/echo', {
      ws: WebSocket,
    }),
  })

  await channel.request({
    method: 'test',
    params: ['first'],
  })

  assert.deepEqual(
    await channel.request({
      method: 'test',
      params: ['second'],
    }),
    {
      result: 'second',
    }
  )
})

test('should error with null id', async function () {
  const codec = new JsonRpcCodec()
  const deferred = pDefer()
  const channel = new Channel({
    codec,
    transport: new WebsocketTransport(URL + '/null-id', {
      ws: WebSocket,
    }),
  })

  channel.on('error', (err) => {
    deferred.resolve(err)
  })
  channel.request({
    method: 'test',
    params: ['second'],
  })

  const res = await deferred.promise

  assert.deepEqual(res.cause, {
    result: 'second',
  })
  assert.equal(res.message, 'Null ID')

  channel.close()
})

test('should timeout', async function () {
  const codec = new JsonRpcCodec()
  const channel = new Channel({
    codec,
    transport: new WebsocketTransport(URL + '/timeout', {
      ws: WebSocket,
    }),
  })

  const r = await channel.request(
    {
      method: 'test',
      params: ['first'],
    },
    100
  )

  if (!r.error) {
    throw new Error('Expected error')
  }

  assert.equal(r.error.message, 'Timeout')
})

test('should receive notification', async function () {
  const codec = new JsonRpcCodec()
  const deferred = pDefer()
  const channel = new Channel({
    codec,
    transport: new WebsocketTransport(URL + '/notify', {
      ws: WebSocket,
    }),
  })

  channel.on('notification', (err) => {
    deferred.resolve(err)
  })

  const res = await deferred.promise

  assert.deepEqual(res, ['notify'])

  channel.close()
})
