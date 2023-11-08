import Emittery from 'emittery'
import { WS } from 'iso-websocket'

/**
 * @typedef {import('./types.js').Transport} Transport
 * @typedef {import('../codecs/types.js').CodecType} CodecType
 */

/**
 * @class WebsocketTransport
 * @extends {Emittery<import('./types.js').TransportEvents>}
 * @implements {Transport}
 */
export class WebsocketTransport extends Emittery {
  /** @type {WS} */
  #ws

  /**
   * @param {import('iso-websocket').UrlProvider} url
   * @param {import('iso-websocket').WSOptions} [opts]
   */
  constructor(url, opts) {
    super()
    this.#ws = new WS(url, opts)
    this.type = /** @type {CodecType} */ ('text')
    this.#ws.addEventListener('message', this.#handleMessage)
    this.#ws.addEventListener('error', this.#handleError)
    this.#ws.addEventListener('close', this.#handleClose)
  }

  #handleMessage = (
    /** @type {import('iso-websocket').WebSocketEventMap['message']} */ e
  ) => {
    this.emit('response', e.data)
  }

  #handleError = (
    /** @type {import('iso-websocket').WebSocketEventMap['error']} */ e
  ) => {
    this.emit('error', new Error('Transport Error', { cause: e.error }))
  }

  #handleClose = (
    /** @type {import('iso-websocket').WebSocketEventMap['close']} */ e
  ) => {
    this.emit('close')
  }

  close() {
    this.#ws.removeEventListener('message', this.#handleMessage)
    this.#ws.removeEventListener('error', this.#handleError)
    this.#ws.removeEventListener('close', this.#handleClose)
    this.#ws.close()
    this.clearListeners()
  }

  /**
   * @param {unknown} data
   */
  async send(data) {
    // @ts-ignore
    this.#ws.send(data)
  }
}
