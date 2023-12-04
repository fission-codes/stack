import { decode } from '@ipld/dag-json'
import Emittery from 'emittery'
import { Channel } from './channel/index.js'
import { JsonRpcCodec } from './channel/codecs/jsonrpc.js'
import * as Schemas from './schemas.js'

/**
 * @template R
 * @template E
 * @typedef {import('./channel/codecs/types.js').MaybeResult<R, E>} MaybeResult
 */

/**
 * @template Out
 * @typedef {import('./types.js').Receipt<Out>} Receipt
 */

/**
 * @typedef {{subscription: string, result: number[]}} SubscriptionNotification
 * @typedef {import('./types.js').HomestarEvents} HomestarEvents
 * @typedef {import('./types.js').HomestarOptions} HomestarOptions
 * @typedef {import('./types.js').Metrics} Metrics
 * @typedef {import('./types.js').MetricsError} MetricsError
 * @typedef {import('./types.js').Health} Health
 * @typedef {import('./types.js').HealthError} HealthError
 * @typedef {import('./types.js').WorkflowNotification} WorkflowNotification
 * @typedef {import('./types.js').WorkflowNotificationError} WorkflowNotificationError
 * @typedef {import('./types.js').EventNotification} EventNotification
 * @typedef {import('./types.js').EventNotificationError} EventNotificationError
 */

const noop = () => {}

/**
 * @class Homestar
 * @extends {Emittery<HomestarEvents>}
 */
export class Homestar extends Emittery {
  /** @type {import('./channel/types.js').IChannel<import('./channel/codecs/types.js').IJsonRpcCodec>} */
  #channel
  /**
   * @param {HomestarOptions} opts
   */
  constructor(opts) {
    super()
    this.opts = opts

    this.#channel = new Channel({
      codec: new JsonRpcCodec(),
      transport: opts.transport,
      timeout: 5000,
    })

    this.#channel.on('error', (error) => {
      this.emit('error', error)
    })
  }

  /**
   *
   * @param {string} method
   * @param {string} subId
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
   *
   * @returns {Promise<MaybeResult<Schemas.Metrics, Schemas.MetricsError | Error>>}
   */
  async metrics() {
    const res = await this.#channel.request({
      method: 'metrics',
    })

    if (res.error) {
      return { error: res.error }
    }

    const parsed = Schemas.Metrics.safeParse(res.result)

    if (parsed.success) {
      return { result: parsed.data }
    }

    return {
      error: parsed.error,
    }
  }

  /**
   * Homestar Health info
   *
   * @returns {Promise<MaybeResult<Schemas.Health, Schemas.HealthError | Error>>}
   */
  async health() {
    const res = await this.#channel.request({
      method: 'health',
    })

    if (res.error) {
      return { error: res.error }
    }

    const parsed = Schemas.Health.safeParse(res.result)

    if (parsed.success) {
      return { result: parsed.data }
    }

    return {
      error: parsed.error,
    }
  }

  /**
   * Run a workflow
   *
   * @param {import('./workflow/index.js').Workflow} workflow
   * @param {(data: Schemas.WorkflowNotification)=>void} [receiptCb] - Callback for workflow receipts
   * @returns {Promise<MaybeResult<void, Error>>}
   */
  async runWorkflow(workflow, receiptCb = noop) {
    const res = /** @type {MaybeResult<string, Error>} */ (
      await this.#channel.request({
        method: 'subscribe_run_workflow',
        // @ts-ignore
        params: [workflow],
      })
    )

    if (res.error) {
      return { error: res.error }
    }

    let receiptCount = 0
    const tasksCount = workflow.workflow.tasks.length
    const subId = res.result
    /** @type {import('emittery').UnsubscribeFunction} */
    const unsub = this.#channel.on(
      'notification',
      // @ts-ignore
      (/** @type {SubscriptionNotification} */ data) => {
        if (data.subscription === subId) {
          receiptCount++
          const decoded = decode(new Uint8Array(data.result))
          const r = Schemas.WorkflowNotification.safeParse(decoded)

          if (r.success === false) {
            this.emit('error', r.error)
          } else {
            receiptCb(r.data)
          }

          if (tasksCount === receiptCount) {
            unsub()
            this.#unsubscribe('unsubscribe_run_workflow', subId)
          }
        }
      }
    )

    return { result: undefined }
  }

  /**
   * Subscribe to a network events
   *
   * @param {(data: Schemas.EventNotification)=>void} [eventCb] - Callback for network events
   * @returns {Promise<MaybeResult<() => void, Error>>}
   */
  async networkEvents(eventCb = noop) {
    const res = /** @type {MaybeResult<string, Error>} */ (
      await this.#channel.request({
        method: 'subscribe_network_events',
      })
    )

    if (res.error) {
      return { error: res.error }
    }

    const subId = res.result
    /** @type {import('emittery').UnsubscribeFunction} */
    const unsub = this.#channel.on(
      'notification',
      // @ts-ignore
      (/** @type {SubscriptionNotification} */ data) => {
        if (data.subscription === subId) {
          const decoded = decode(new Uint8Array(data.result))
          const r = Schemas.EventNotification.safeParse(decoded)
          if (r.success === false) {
            this.emit('error', r.error)
          } else {
            eventCb(r.data)
          }
        }
      }
    )

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
   * @returns {Promise<MaybeResult<AsyncIterable<Schemas.EventNotification>, Error>>}
   */
  async networkEventsIterator() {
    const res = /** @type {MaybeResult<string, Error>} */ (
      await this.#channel.request({
        method: 'subscribe_network_events',
      })
    )

    if (res.error) {
      return { error: res.error }
    }

    const subId = res.result
    const notifications =
      /** @type {AsyncIterableIterator<SubscriptionNotification>} */ (
        this.#channel.events('notification')
      )
    // eslint-disable-next-line unicorn/no-this-assignment
    const instance = this

    return {
      result: {
        async *[Symbol.asyncIterator]() {
          try {
            for await (const notification of notifications) {
              if (notification.subscription === subId) {
                const decoded = decode(new Uint8Array(notification.result))
                const r = Schemas.EventNotification.safeParse(decoded)
                if (r.success === false) {
                  instance.emit('error', r.error)
                } else {
                  yield r.data
                }
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
