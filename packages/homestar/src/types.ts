import type { ZodTypeAny } from 'zod'

import type { Transport } from './channel/transports/types'
import type * as Schemas from './schemas'

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

export type Result<Out = any> = ['ok' | 'error', Out]

// Export schemas types
export * from './schemas'

export interface Receipt<Out> extends Schemas.Receipt {
  out: Result<Out>
}
