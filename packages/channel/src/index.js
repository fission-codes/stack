/* eslint-disable unicorn/no-null */
import Emittery from 'emittery'

// eslint-disable-next-line no-unused-vars
import * as T from './types.js'

/**
 * @class Channel
 * @template {T.Codec} C
 * @template {T.Service<Array<T.InferCodec<C>['io']>, T.InferCodec<C>['io']['out']>} S
 * @implements {T.IChannel<C,S>}
 * @extends {Emittery<T.ChannelEvents<C, S>>}
 */
export class Channel extends Emittery {
  /** @type {Map<string, {resolve: (value: any) => void}>} */
  #queue = new Map()
  /**
   *
   * @param {T.ChannelOptions<C>} opts
   */
  constructor(opts) {
    super()
    /** @type {Required<T.ChannelOptions<C>>} */
    this.opts = { timeout: 5000, ...opts }

    this.opts.transport.on('response', this.#handleResponse)
    this.opts.transport.on('error', this.#handleError)
  }

  /**
   * @param {S} data
   */
  test(data) {}

  /**
   *
   * @param {string} id
   * @param {number} [timeout]
   */
  #queueRequest(id, timeout) {
    return new Promise((resolve, reject) => {
      if (timeout) {
        setTimeout(() => {
          this.#queue.delete(id)

          resolve({
            error: new Error(`Request ${id} timed out after ${timeout}ms.`),
          })
        }, timeout)
      }
      this.#queue.set(id, { resolve })
    })
  }

  #handleError = (/** @type {Error} */ error) => {
    this.emit('error', new Error('Transport Error', { cause: error }))
  }

  /**
   * Handle response from transport
   *
   * @param {string | ArrayBuffer} data
   */
  #handleResponse = (data) => {
    const { id, data: decoded } = this.opts.codec.decode(data)

    if (id === undefined && decoded.result) {
      this.emit('notification', decoded.result)
    }

    if (id === undefined && decoded.error) {
      this.emit('error', new Error('Codec Error', { cause: decoded.error }))
    }

    if (decoded && id != null) {
      const prom = this.#queue.get(id.toString())
      if (prom) {
        prom.resolve(decoded)
      }
    }

    if (id === null) {
      this.emit('error', new Error('Null ID', { cause: decoded }))
    }
  }

  /** @type {T.IChannel<C, S>['request']} */
  request(data, timeout = this.opts.timeout) {
    const encoded = this.opts.codec.encode(data)

    this.opts.transport.send(encoded, { timeout })

    return this.#queueRequest(encoded.id.toString(), timeout)
  }

  close() {
    this.opts.transport.close()
    this.#queue.clear()
    this.clearListeners()
  }
}
