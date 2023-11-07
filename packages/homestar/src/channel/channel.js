/* eslint-disable unicorn/no-null */
import Emittery from 'emittery'

/**
 * @typedef {import('./codecs/types').CodecType} CodecType
 * @typedef {import('./codecs/types').Codec} Codec
 */

/**
 * @template {Codec} C
 * @typedef {import('./types').IChannel<C>} IChannel
 */

/**
 * @class Channel
 * @template {Codec} C
 * @implements {IChannel<C>}
 * @extends {Emittery<import('./types').ChannelEvents<C>>}
 */
export class Channel extends Emittery {
  /** @type {Map<string, {resolve: (value: any) => void}>} */
  #queue = new Map()
  /**
   *
   * @param {import('./types').ChannelOptions<C>} opts
   */
  constructor(opts) {
    super()
    /** @type {Required<import('./types').ChannelOptions<C>>} */
    this.opts = { timeout: 5000, ...opts }

    this.opts.transport.on('response', this.#handleResponse)
  }

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
            error: new Error('Timeout'),
          })
        }, timeout)
      }
      this.#queue.set(id, { resolve })
    })
  }

  /**
   *
   * @param {string | ArrayBuffer} data
   */
  #handleResponse = (data) => {
    const { id, data: decoded } = this.opts.codec.decode(data)

    if (id === undefined && decoded.result) {
      this.emit('notification', decoded.result)
    }

    if (id === undefined && decoded.error) {
      this.emit('error', new Error('Codec Error', { cause: decoded }))
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

  /** @type {IChannel<C>['request']} */
  request(data, timeout = this.opts.timeout) {
    const { id, data: encoded } = this.opts.codec.encode(data)

    this.opts.transport.send(encoded, timeout)

    return this.#queueRequest(id.toString(), timeout)
  }

  close() {
    this.#queue.clear()
    this.opts.transport.off('response', this.#handleResponse)
    this.opts.transport.close()
  }
}
