/* eslint-disable unicorn/no-null */
// eslint-disable-next-line no-unused-vars
import * as T from '../types.js'

/**
 * @typedef {T.IJsonRpcCodec} IJsonRpcCodec
 */

/**
 * Next id generator
 */
function defaultNextID() {
  let lastId = -1
  return () => ++lastId
}

/**
 * Check if the value is a JsonRpcRequest
 *
 * @param {unknown} value
 * @returns {value is T.JsonRpcRequest}
 */
function isJsonRpcRequest(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jsonrpc' in value &&
    value.jsonrpc === '2.0' &&
    'method' in value &&
    typeof value.method === 'string'
  )
}

/**
 * JSON RPC Codec
 *
 * @implements {IJsonRpcCodec}
 */
export class JsonRpcCodec {
  /** @type {() => number | string} */
  #nextId

  constructor() {
    this.#nextId = defaultNextID()
  }

  /** @type {IJsonRpcCodec['encode']} */
  encode(data) {
    const id = this.#nextId()
    return {
      id,
      data: JSON.stringify({
        jsonrpc: '2.0',
        method: data.method,
        params: data.params,
        id,
      }),
    }
  }

  /** @type {IJsonRpcCodec['decode']} */
  decode(data) {
    if (typeof data !== 'string') {
      return {
        data: {
          error: new Error(
            `Invalid channel data type expected string got ${typeof data}.`,
            { cause: data }
          ),
        },
      }
    }

    const parsed = /** @type {T.JsonRpcResponse | T.JsonRpcRequest} */ (
      JSON.parse(data)
    )

    // Handle notifications
    if (isJsonRpcRequest(parsed)) {
      return {
        id: parsed.id,
        data: {
          result: parsed.params ?? null,
        },
      }
    }

    // Handle responses and errors
    if (parsed.error) {
      return {
        id: parsed.id,
        data: {
          error: new Error(parsed.error.message, {
            cause: parsed.error,
          }),
        },
      }
    }

    return { id: parsed.id, data: { result: parsed.result } }
  }
}
