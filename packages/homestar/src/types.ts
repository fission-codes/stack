import type { ZodTypeAny } from 'zod'
import { type Opaque } from 'type-fest'
import type { Transport } from './channel/transports/types'
import type * as Schemas from './schemas'
import type { IO, Service } from './channel/types'
import type { Workflow } from './workflow/types'

export * from './channel/types'
// Export schemas types
export * from './schemas'
export * from './workflow/types'

export type InferError<S extends ZodTypeAny> = Extract<
  ReturnType<S['safeParse']>,
  { success: false }
>['error']

export interface HomestarOptions {
  transport: Transport<string>
}

export interface HomestarEvents {
  error: Error
}

export type ReceiptOut<Out = any> = ['ok' | 'error', Out]

export interface Receipt<Out> extends Schemas.Receipt {
  out: ReceiptOut<Out>
}

export type HomestarService = Service<
  [
    IO<{ method: 'metrics' }, Schemas.Metrics>,
    IO<{ method: 'health' }, Schemas.Health>,
    IO<{ method: 'subscribe_run_workflow'; params: Workflow[] }, string>,
    IO<{ method: 'subscribe_network_events' }, string>,
    IO<
      {
        method: 'unsubscribe_run_workflow' | 'unsubscribe_network_events'
        params: [string]
      },
      null
    >,
  ],
  | {
      subscription: string
      /**
       * IPLD dag-json encoded {@link Schemas.WorkflowNotification}
       *
       */
      result: Opaque<number[], Schemas.WorkflowNotification>
    }
  | {
      subscription: string
      /**
       * IPLD dag-json encoded {@link Schemas.EventNotification}
       *
       */
      result: Opaque<number[], Schemas.EventNotification>
    }
>
