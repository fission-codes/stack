import type Emittery from 'emittery'
import type { CodecEncoded } from '../codecs/types'

export type Data = string | ArrayBufferLike | Blob | ArrayBufferView

export interface TransportEvents<D, E extends Error = Error> {
  response: D
  error: E
  close: undefined
}

export interface TransportSendOptions {
  timeout?: number
}
export interface Transport<D = any> extends Emittery<TransportEvents<D>> {
  send: (data: CodecEncoded<D>, options?: TransportSendOptions) => void
  close: () => void
}
