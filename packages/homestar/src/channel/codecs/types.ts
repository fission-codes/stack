import type { JsonArray, JsonObject, JsonValue } from 'type-fest'

export type MaybeResult<ResultType = unknown, ErrorType = Error> =
  | {
      error: ErrorType
      result?: undefined
    }
  | {
      result: ResultType
      error?: undefined
    }

/**
 * Codec
 */

export interface CodecEncoded<DataType> {
  id: number | string
  data: DataType
}

export interface CodecDecoded<Out = any, Err extends Error = Error> {
  id?: number | string | null
  data: MaybeResult<Out, Err>
}

export interface Codec<
  DataType = any,
  In = any,
  Out = any,
  Err extends Error = Error,
> {
  encode: (data: In) => CodecEncoded<DataType>
  decode: (data: DataType) => CodecDecoded<Out, Err>
}

/**
 * JSON-RPC 2.0
 */

export type JsonRpcParams = JsonArray | JsonObject
export interface JsonRpcError {
  code: number
  message: string
  data?: JsonValue
}
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: number | string | null
  /**
   * A String containing the name of the method to be invoked. Method names that begin with the word rpc followed by a period character (U+002E or ASCII 46) are reserved for rpc-internal methods and extensions and MUST NOT be used for anything else.
   */
  method: string
  params?: JsonRpcParams
}

export type JsonRpcResponse =
  | {
      jsonrpc: '2.0'
      id: number | string | null
      result: JsonArray | JsonObject
      error?: undefined
    }
  | {
      jsonrpc: '2.0'
      id: number | string | null
      error: JsonRpcError
      result?: undefined
    }

export type IJsonRpcCodec = Codec<
  string,
  {
    method: string
    params?: JsonRpcParams
  },
  JsonValue,
  Error
>
