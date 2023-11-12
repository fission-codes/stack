import type { ZodTypeAny } from 'zod'

import type { Transport } from './channel/transports/types'

export type InferError<S extends ZodTypeAny> = Extract<
  ReturnType<S['safeParse']>,
  { success: false }
>['error']

export interface HomestarOptions {
  transport: Transport
}

export interface HomestarEvents {
  error: Error
}

export type Result<Out> = ['ok' | 'error', Out]
