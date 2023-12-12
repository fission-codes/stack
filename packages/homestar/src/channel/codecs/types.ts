import type { JsonValue, Jsonifiable } from 'type-fest'
import type { IO } from '../types'

export type Result<ResultType = unknown, ErrorType = Error> =
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

/**
 * Codec encoded data
 *
 * @template DataType Data type for the transport
 */
export interface CodecEncoded<DataType> {
  id: number | string
  data: DataType
}

/**
 * Codec decoded data
 *
 * @template Out Result type
 * @template Err Error type
 */
export interface CodecDecoded<D extends Result> {
  id?: number | string | null
  data: D
}

/**
 * Codec interface
 *
 * @template DataType Data type for the transport
 * @template S Api
 * @template Err Error type
 */
export interface Codec<
  DataType = any,
  In = any,
  Out = any,
  Err extends Error = Error,
> {
  encode: (data: In) => CodecEncoded<DataType>
  decode: (data: DataType) => CodecDecoded<Result<Out, Err>>
}

export type InferCodec<C extends Codec> = C extends Codec<
  infer D,
  infer I,
  infer O,
  infer E
>
  ? { type: D; io: IO<I, O>; error: E }
  : never

/**
 * JSON-RPC 2.0
 */

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
  params?: JsonValue
}

export type JsonRpcResponse =
  | {
      jsonrpc: '2.0'
      id: number | string | null
      result: JsonValue
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
  { method: string; params?: unknown },
  Jsonifiable,
  Error
>
