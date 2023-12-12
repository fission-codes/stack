import { decode } from '@ipld/dag-json'
import Emittery from 'emittery'
import { Channel } from './channel/index.js'
import { JsonRpcCodec } from './channel/codecs/jsonrpc.js'

// eslint-disable-next-line no-unused-vars
import * as T from './types.js'

/**
 * @template {unknown} [R=unknown]
 * @template {Error} [E=Error]
 * @typedef {T.Codec.Result<R, E>} Result
 */

/**
 * @template Out
 * @typedef {T.Receipt<Out>} Receipt
 */

/**
 * @typedef {T.HomestarEvents} HomestarEvents
 * @typedef {T.HomestarOptions} HomestarOptions
 * @typedef {T.Metrics} Metrics
 * @typedef {T.Health} Health
 * @typedef {T.WorkflowNotification} WorkflowNotification
 * @typedef {T.EventNotification} EventNotification
 */

const noop = () => {}

/**
 * @class Homestar
 * @extends {Emittery<HomestarEvents>}
 */
export class Homestar extends Emittery {
  /** @type {T.IChannel<JsonRpcCodec, T.HomestarService>} */
  #channel
  /**
   * @param {HomestarOptions} opts
   */
  constructor(opts) {
    super()
    this.opts = opts
    this.#channel = /** @type {T.IChannel<JsonRpcCodec, T.HomestarService>} */ (
      new Channel({
        codec: new JsonRpcCodec(),
        transport: opts.transport,
        timeout: 5000,
      })
    )

    this.#channel.on('error', (error) => {
      this.emit('error', error)
    })
  }

  /**
   *
   * @param {'unsubscribe_run_workflow' | 'unsubscribe_network_events' } method
   * @param { string } subId
   */
  #unsubscribe(method, subId) {
    this.#channel
      .request({
        method,
        params: [subId],
      })
      .then(
        (res) => {
          if (res.error) {
            return this.emit(
              'error',
              new Error(`Failed to unsubscribe ${method} with id ${subId}`, {
                cause: res.error,
              })
            )
          }
        },
        (error) => {
          this.emit('error', error)
        }
      )
  }

  /**
   * Homestar Prometheus metrics
   */
  async metrics() {
    return this.#channel.request({
      method: 'metrics',
    })
  }

  /**
   * Homestar Health info
   */
  health() {
    return this.#channel.request({
      method: 'health',
    })
  }

  /**
   * Run a workflow
   *
   * @param {T.Workflow} workflow
   * @param {(data: T.WorkflowNotification)=>void} [receiptCb] - Callback for workflow receipts
   * @returns {Promise<T.Codec.Result<void, Error>>}
   */
  async runWorkflow(workflow, receiptCb = noop) {
    const res = await this.#channel.request({
      method: 'subscribe_run_workflow',
      params: [workflow],
    })

    if (res.error) {
      return { error: res.error }
    }

    let receiptCount = 0
    const tasksCount = workflow.workflow.tasks.length
    const subId = res.result
    /** @type {import('emittery').UnsubscribeFunction} */
    const unsub = this.#channel.on('notification', (data) => {
      if (data.subscription === subId) {
        receiptCount++
        /** @type {T.WorkflowNotification} */
        const decoded = decode(new Uint8Array(data.result))
        receiptCb(decoded)

        if (tasksCount === receiptCount) {
          unsub()
          this.#unsubscribe('unsubscribe_run_workflow', subId)
        }
      }
    })

    return { result: undefined }
  }

  /**
   * Subscribe to a network events
   *
   * @param {(data: T.EventNotification)=>void} [eventCb] - Callback for network events
   * @returns {Promise<T.Codec.Result<() => void, Error>>}
   */
  async networkEvents(eventCb = noop) {
    const res = await this.#channel.request({
      method: 'subscribe_network_events',
    })

    if (res.error) {
      return { error: res.error }
    }

    const subId = res.result
    /** @type {import('emittery').UnsubscribeFunction} */
    const unsub = this.#channel.on('notification', (data) => {
      if (data.subscription === subId) {
        /** @type {T.EventNotification} */
        const decoded = decode(new Uint8Array(data.result))
        eventCb(decoded)
      }
    })

    return {
      result: () => {
        unsub()
        this.#unsubscribe('unsubscribe_network_events', subId)
      },
    }
  }

  /**
   * Subscribe to a network events iterator
   *
   * @returns {Promise<T.Codec.Result<AsyncIterable<T.EventNotification>, Error>>}
   */
  async networkEventsIterator() {
    const res = await this.#channel.request({
      method: 'subscribe_network_events',
    })

    if (res.error) {
      return { error: res.error }
    }

    const subId = res.result
    const notifications = this.#channel.events('notification')
    // eslint-disable-next-line unicorn/no-this-assignment
    const instance = this

    return {
      result: {
        async *[Symbol.asyncIterator]() {
          try {
            for await (const notification of notifications) {
              if (notification.subscription === subId) {
                /** @type {T.EventNotification} */
                const decoded = decode(new Uint8Array(notification.result))
                yield decoded
              }
            }
          } finally {
            instance.#unsubscribe('unsubscribe_network_events', subId)
          }
        },
      },
    }
  }

  /**
   * Close homestar channel and clean listeners
   */
  close() {
    this.#channel.close()
    this.clearListeners()
  }
}
