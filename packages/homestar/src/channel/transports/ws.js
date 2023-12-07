import Emittery from 'emittery'
import { WS } from 'iso-websocket'

/**
 * @typedef {import('./types.js').Data} Data
 */

/**
 * @template {Data} [DataType=Data]
 * @typedef {import('./types.js').Transport<DataType>} Transport
 */

/**
 * @class WebsocketTransport
 * @template {Data} [DataType=Data]
 * @extends {Emittery<import('./types.js').TransportEvents<DataType>>}
 * @implements {Transport<DataType>}
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
   * @param {import('../codecs/types.js').CodecEncoded<DataType>} data
   */
  async send(data) {
    this.#ws.send(data.data)
  }
}
