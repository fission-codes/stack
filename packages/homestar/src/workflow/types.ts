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

export interface InvocationOptions<
  Args extends Record<string, any> = Record<string, any>,
> {
  name: string
  needs?: string | string[]
  args: Args
  /**
   * The resource to use for the invocation. This should be a URI but for now just pass the CID string.
   */
  resource: string
}

/**
 * Helper methods
 */

export type CropInvocation = TemplateInvocation<
  [CID | Placeholder | DataURI, number, number, number, number]
>
export type CropOptions = InvocationOptions<{
  data: CID | Placeholder | DataURI
  x: number
  y: number
  width: number
  height: number
}>

export type GrayscaleInvocation = TemplateInvocation<
  [CID | Placeholder | DataURI]
>
export type GrayscaleOptions = InvocationOptions<{
  data: CID | Placeholder | DataURI
}>

export type Rotate90Invocation = TemplateInvocation<
  [CID | Placeholder | DataURI]
>
export type Rotate90Options = InvocationOptions<{
  data: CID | Placeholder | DataURI
}>

export type BlurInvocation = TemplateInvocation<
  [CID | Placeholder | DataURI, number]
>
export type BlurOptions = InvocationOptions<{
  data: CID | Placeholder | DataURI
  sigma: number
}>

export type AddOneInvocation = TemplateInvocation<[number | Placeholder]>
export type AddOneOptions = InvocationOptions<{
  a: number | Placeholder
}>

export type AppendStringInvocation = TemplateInvocation<[string | Placeholder]>
export type AppendStringOptions = InvocationOptions<{
  a: string | Placeholder
}>

export type JoinStringsInvocation = TemplateInvocation<
  [string | Placeholder, string | Placeholder]
>
export type JoinStringsOptions = InvocationOptions<{
  a: string | Placeholder
  b: string | Placeholder
}>

export type TransposeInvocation = TemplateInvocation<[[[number]] | Placeholder]>
export type TransposeOptions = InvocationOptions<{
  matrix: [[number]] | Placeholder
}>
