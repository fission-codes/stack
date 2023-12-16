import type Emittery from 'emittery'
import { type Exact } from 'type-fest'
import type { Codec, InferCodec, Result } from './codecs/types'
import type { Transport } from './transports/types'

export * from './codecs/types'
export * from './transports/types'

/**
 * Service
 */

export interface IO<In = any, Out = any> {
  in: In
  out: Out
}

export type Service<Methods extends IO[] = IO[], Notifications = unknown> = [
  Methods,
  Notifications,
]

export type InferArgs<T extends IO[]> = T[number] extends infer Elem
  ? Elem extends IO<infer E, any>
    ? E
    : never
  : never

export type InferResults<
  T extends IO[],
  Err extends Error = Error,
> = T[number] extends infer Elem
  ? Elem extends IO<any, infer O>
    ? Result<O, Err>
    : never
  : never

export type InferResult<
  T extends IO[],
  In,
  Err extends Error = Error,
> = T[number] extends infer Elem
  ? Elem extends IO<infer E, infer O>
    ? In extends E
      ? Result<O, Err>
      : never
    : never
  : never

/**
 * Channel interface
 */

export interface ChannelEvents<
  C extends Codec,
  S extends Service<Array<InferCodec<C>['io']>, InferCodec<C>['io']['out']>,
> {
  error: Error & InferCodec<C>['error']
  notification: S[1]
}

export interface IChannel<
  C extends Codec,
  S extends Service<Array<InferCodec<C>['io']>>,
> extends Emittery<ChannelEvents<C, S>> {
  opts: Required<ChannelOptions<C>>
  request: <Args extends Exact<InferArgs<S[0]>, Args>>(
    data: Args,
    timeout?: number
  ) => Promise<InferResult<S[0], Args, InferCodec<C>['error']>>
  // notify: (method: string, params?: Params) => void
  close: () => void
}

export interface ChannelOptions<C extends Codec> {
  transport: Transport<InferCodec<C>['type']>
  timeout?: number
  codec: C
}

export type TestService = Service<
  [
    IO<{ method: 'test'; params: string[] }, number>,
    IO<{ method: 'test2'; params: number[] }, string>,
  ]
>
