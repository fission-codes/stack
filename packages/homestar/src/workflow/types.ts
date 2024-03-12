import { type z } from 'zod'
import type { CID } from 'multiformats/cid'
import type * as Schemas from './schemas'

export type Workflow = z.infer<typeof Schemas.Workflow>

export interface WorkflowContext {
  needs: Record<
    string,
    {
      output?: {
        'await/ok': CID
      }
    }
  >
  cid: (str: string) => CID
}

export type TemplateInput = string | Record<string, any> | any[]
export type TemplateOutput<T extends TemplateInput> = T extends string
  ? string
  : T extends any[]
    ? any[]
    : T extends Record<string, any>
      ? TemplateTask<any>
      : T

export interface TemplateWorkflow<Args extends any[] = any[]>
  extends z.infer<typeof Schemas.TemplateWorkflow> {
  workflow: {
    tasks: Array<TemplateInvocation<Args>>
  }
}
export interface TemplateTask<Args extends any[]>
  extends z.infer<typeof Schemas.TemplateTask> {
  input: {
    args: Args
    func: string
  }
}

export interface TemplateInvocation<Args extends any[] = any[]>
  extends z.infer<typeof Schemas.TemplateInvocation> {
  run: TemplateTask<Args>
}

export type Placeholder = `{{${string}${`:${string}` | ''}}}`
export type DataURI = `data:${string};base64,${string}`
export type Resource = `ipfs://${string}`

export interface InvocationOptions<Args extends any[] = any[]> {
  name: string
  args: Args
  func: string
  resource: Resource
  /**
   * Base 32 hex (lower) encoded random bytes, either 12 or 16 bytes long
   */
  nnc?: string
}

export interface TemplateOptions<
  Args extends Record<string, any> = Record<string, any>,
> {
  name: string
  args: Args
  /**
   * The resource URI to use for the invocation.
   *
   * @example `ipfs://Qm...`
   */
  resource: Resource
}

/**
 * Helper methods
 */

export type CropInvocation = TemplateInvocation<
  [CID | Placeholder | DataURI, number, number, number, number]
>
export type CropOptions = TemplateOptions<{
  data: CID | Placeholder | DataURI
  x: number
  y: number
  width: number
  height: number
}>

export type GrayscaleInvocation = TemplateInvocation<
  [CID | Placeholder | DataURI]
>
export type GrayscaleOptions = TemplateOptions<{
  data: CID | Placeholder | DataURI
}>

export type Rotate90Invocation = TemplateInvocation<
  [CID | Placeholder | DataURI]
>
export type Rotate90Options = TemplateOptions<{
  data: CID | Placeholder | DataURI
}>

export type BlurInvocation = TemplateInvocation<
  [CID | Placeholder | DataURI, number]
>
export type BlurOptions = TemplateOptions<{
  data: CID | Placeholder | DataURI
  sigma: number
}>

export type AddOneInvocation = TemplateInvocation<[number | Placeholder]>
export type AddOneOptions = TemplateOptions<{
  a: number | Placeholder
}>

export type AppendStringInvocation = TemplateInvocation<[string | Placeholder]>
export type AppendStringOptions = TemplateOptions<{
  a: string | Placeholder
}>

export type JoinStringsInvocation = TemplateInvocation<
  [string | Placeholder, string | Placeholder]
>
export type JoinStringsOptions = TemplateOptions<{
  a: string | Placeholder
  b: string | Placeholder
}>

export type TransposeInvocation = TemplateInvocation<[[[number]] | Placeholder]>
export type TransposeOptions = TemplateOptions<{
  matrix: [[number]] | Placeholder
}>
