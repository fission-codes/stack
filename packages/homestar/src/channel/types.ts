import type Emittery from 'emittery'
import type { Codec } from './codecs/types'
import type { Transport } from './transports/types'

/**
 * Channel interface
 */

export interface ChannelEvents<C extends Codec> {
  error: Error
  notification: Required<ReturnType<C['decode']>['data']>['result']
}

export interface IChannel<C extends Codec = Codec>
  extends Emittery<ChannelEvents<C>> {
  opts: Required<ChannelOptions<C>>
  request: (
    data: Parameters<C['encode']>[0],
    timeout?: number
  ) => Promise<ReturnType<C['decode']>['data']>
  // notify: (method: string, params?: Params) => void
  close: () => void
}

export interface ChannelOptions<C extends Codec> {
  transport: Transport
  timeout?: number
  codec: C
}
