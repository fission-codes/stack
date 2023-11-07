import { decode } from '@ipld/dag-json'
import { Channel } from './channel/channel.js'
import { JsonRpcCodec } from './channel/codecs/jsonrpc.js'
import * as Schemas from './schemas.js'

/**
 * @template R
 * @template E
 * @typedef {import('./channel/codecs/types.js').MaybeResult<R, E>} MaybeResult
 */

/**
 * @typedef {{subscription: string, result: number[]}} SubscriptionNotification
 */

/**
 * @class Homestar
 */
export class Homestar {
  /** @type {import('./channel/types.js').IChannel<import('./channel/codecs/types.js').IJsonRpcCodec>} */
  #channel
  /**
   * @param {import("./types.js").HomestarOptions} opts
   */
  constructor(opts) {
    this.opts = opts

    this.#channel = new Channel({
      codec: new JsonRpcCodec(),
      transport: opts.transport,
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
   * Subscribe to a workflow
   *
   * @param {any} workflow
   * @param {(data: MaybeResult<Schemas.WorkflowNotification, Schemas.WorkflowNotificationError>)=>void} [receiptCb] - Callback for workflow notifications
   */
  async runWorkflow(workflow, receiptCb) {
    const res = /** @type {MaybeResult<string, Error>} */ (
      await this.#channel.request({
        method: 'subscribe_run_workflow',
        params: [workflow],
      })
    )

    if (res.result !== undefined) {
      const subId = res.result
      let unsub

      if (receiptCb) {
        unsub = this.#channel.on(
          'notification',
          // @ts-ignore
          (/** @type {SubscriptionNotification} */ data) => {
            if (data.subscription === subId) {
              const decoded = decode(new Uint8Array(data.result))
              const r = Schemas.WorkflowNotification.safeParse(decoded)
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
        unsubscribe: unsub,
      }
    }

    return { error: res.error }
  }
}
