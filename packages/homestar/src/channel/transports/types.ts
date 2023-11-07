import type Emittery from 'emittery'
import type { CodecType, DataType } from '../codecs/types'

export interface TransportEvents {
  response: DataType
  error: Error
  close: undefined
}
export interface Transport extends Emittery<TransportEvents> {
  type: CodecType
  send: (data: unknown, timeout?: number) => Promise<any>
  close: () => void
}
