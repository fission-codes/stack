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
 * @typedef {{subscription: string, result: number[]}} SubscriptionNotification
 * @typedef {import('./types.js').HomestarEvents} HomestarEvents
 * @typedef {import('./types.js').HomestarOptions} HomestarOptions
 */

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
    })

    this.#channel.on('error', (error) => {
      this.emit('error', error)
    })
  }

  /**
   * Homestar Prometheus metrics
   *
   * @returns {Promise<MaybeResult<Schemas.Metrics, Schemas.MetricsError>>}
   */
  async metrics() {
    const res = await this.#channel.request({
      method: 'metrics',
    })

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
   * @returns {Promise<MaybeResult<Schemas.Health, Schemas.HealthError>>}
   */
  async health() {
    const res = await this.#channel.request({
      method: 'health',
    })

    const parsed = Schemas.Health.safeParse(res.result)

    if (parsed.success) {
      return { result: parsed.data }
    }

    return {
      error: parsed.error,
    }
  }

  /**
   * Subscribe to a workflow
   *
   * @param {import('./workflow/index.js').Workflow} workflow
   * @param {(data: MaybeResult<Schemas.WorkflowNotification, Schemas.WorkflowNotificationError>)=>void} [receiptCb] - Callback for workflow notifications
   */
  async runWorkflow(workflow, receiptCb) {
    const res = /** @type {MaybeResult<string, Error>} */ (
      await this.#channel.request({
        method: 'subscribe_run_workflow',
        // @ts-ignore
        params: [workflow],
      })
    )

    if (res.result !== undefined) {
      const tasksCount = workflow.workflow.tasks.length
      let receiptCount = 0
      const subId = res.result
      /** @type {import('emittery').UnsubscribeFunction} */
      let unsub

      if (receiptCb) {
        unsub = this.#channel.on(
          'notification',
          // @ts-ignore
          (/** @type {SubscriptionNotification} */ data) => {
            if (data.subscription === subId) {
              receiptCount++
              const decoded = decode(new Uint8Array(data.result))
              const r = Schemas.WorkflowNotification.safeParse(decoded)
              if (r.success === false) {
                receiptCb({ error: r.error })
              } else {
                receiptCb({ result: r.data })
              }

              if (tasksCount === receiptCount) {
                unsub()
                this.#channel
                  .request({
                    method: 'unsubscribe_run_workflow',
                    params: [subId],
                  })
                  .then(
                    (res) => {
                      if (res.error) {
                        return this.emit('error', res.error)
                      }
                    },
                    (error) => {
                      this.emit('error', error)
                    }
                  )
              }
            }
          }
        )
      }
      return {
        result: subId,
      }
    }

    return { error: res.error }
  }

  /**
   * Subscribe to a network events
   *
   * @param {(data: MaybeResult<Schemas.EventNotification, Schemas.EventNotificationError>)=>void} [receiptCb] - Callback for network events
   */
  async networkEvents(receiptCb) {
    const res = /** @type {MaybeResult<string, Error>} */ (
      await this.#channel.request({
        method: 'subscribe_network_events',
      })
    )

    if (res.result !== undefined) {
      const subId = res.result
      /** @type {import('emittery').UnsubscribeFunction} */
      let unsub

      if (receiptCb) {
        unsub = this.#channel.on(
          'notification',
          // @ts-ignore
          (/** @type {SubscriptionNotification} */ data) => {
            if (data.subscription === subId) {
              const decoded = decode(new Uint8Array(data.result))
              const r = Schemas.EventNotification.safeParse(decoded)
              if (r.success === false) {
                receiptCb({ error: r.error })
              } else {
                receiptCb({ result: r.data })
              }
            }
          }
        )
      }
      return {
        result: subId,
        unsub: () => {
          unsub()
          this.#channel
            .request({
              method: 'unsubscribe_network_events',
              params: [subId],
            })
            .then(
              (res) => {
                if (res.error) {
                  return this.emit('error', res.error)
                }
              },
              (error) => {
                this.emit('error', error)
              }
            )
        },
      }
    }

    return { error: res.error }
  }

  /**
   * Close homestar channel and clean listeners
   */
  close() {
    this.#channel.close()
    this.clearListeners()
  }
}
