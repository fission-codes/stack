/* eslint-disable unicorn/no-null */
/**
 * @typedef {import('./types').IJsonRpcCodec} IJsonRpcCodec
 * @typedef {import('./types').JsonRpcRequest} JsonRpcRequest
 * @typedef {import('./types').JsonRpcResponse} JsonRpcResponse
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
 * @returns {value is JsonRpcRequest}
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
 * @implements {IJsonRpcCodec}
 */
export class JsonRpcCodec {
  /** @type {() => number | string} */
  #nextId

  /** @type {IJsonRpcCodec['type']} */
  type

  constructor() {
    this.#nextId = defaultNextID()
    this.type = 'text'
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
    if (typeof data === 'string') {
      const parsed = /** @type {JsonRpcResponse | JsonRpcRequest} */ (
        JSON.parse(data)
      )

      if (isJsonRpcRequest(parsed)) {
        return {
          id: parsed.id,
          data: {
            result: parsed.params ?? null,
          },
        }
      }

      if (parsed.result) {
        return { id: parsed.id, data: { result: parsed.result } }
      }
      if (parsed.error) {
        return {
          id: parsed.id,
          data: {
            error: new Error(parsed.error.message, {
              cause: parsed.error.data,
            }),
          },
        }
      }
    }

    return {
      data: {
        error: new Error('Invalid response'),
      },
    }
  }
}
