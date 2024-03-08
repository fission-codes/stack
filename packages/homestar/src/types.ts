import type { ZodTypeAny } from 'zod'
import { type Opaque } from 'type-fest'
import type { IO, Service, Transport } from '@fission-codes/channel/types'
import type * as Schemas from './schemas'
import type { Workflow } from './workflow/types'

export * from '@fission-codes/channel/types'
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

export interface WitOptions {
  entryPoint?: string
  source?: string
  worldName: string
  wasiImports?: Set<string>
}

export interface WasmifyOptions {
  /**
   * The entry point of the js module
   */
  entryPoint: string
  /**
   * The directory to output the generated files
   *
   * @default '<cwd>'
   */
  outDir?: string

  /**
   * The name of the generated Wit World
   *
   * @default '<bundle-hash>'
   */
  worldName?: string

  /**
   * Wit dependencies directory
   *
   * NOTE: this should be the directory where you run `wit-deps` and this script maybe delete any top level .wit files not inside the deps directory
   *
   * @default '<path-to-@fission-codes/homestar-wit>'
   */
  witPath?: string

  /**
   * Componentize JS debug flag
   *
   * @default false
   */
  debug?: boolean
}
