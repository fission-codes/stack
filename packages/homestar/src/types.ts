import type { ZodTypeAny } from 'zod'
import type { CID } from 'multiformats/cid'
import type { Transport } from './channel/transports/types'
import type { Invocation, Task, Workflow } from './schemas'

export type InferError<S extends ZodTypeAny> = Extract<
  ReturnType<S['safeParse']>,
  { success: false }
>['error']

export interface HomestarOptions {
  transport: Transport
}

export type Result<Out> = ['ok' | 'error', Out]

export interface TemplateWorkflow<Args extends any[] = any[]> extends Workflow {
  workflow: {
    tasks: Array<TemplateInvocation<Args>>
  }
}
export interface TemplateTask<Args extends any[]> extends Task {
  name: string
  needs?: string
  input: {
    args: Args
    func: string
  }
}

export interface TemplateInvocation<Args extends any[] = any[]>
  extends Invocation {
  run: TemplateTask<Args>
}

export type Placeholder = `{{${string}${`:${string}` | ''}}}`

export interface InvocationOptions<
  Args extends Record<string, any> = Record<string, any>,
> {
  name: string
  needs?: string
  args: Args
  resource: string
}

export type CropInvocation = TemplateInvocation<
  [CID | Placeholder, number, number, number, number]
>
export type CropOptions = InvocationOptions<{
  data: CID | Placeholder
  x: number
  y: number
  width: number
  height: number
}>

export type GrayscaleInvocation = TemplateInvocation<[CID | Placeholder]>
export type GrayscaleOptions = InvocationOptions<{
  data: CID | Placeholder
}>

export type Rotate90Invocation = TemplateInvocation<[CID | Placeholder]>
export type Rotate90Options = InvocationOptions<{
  data: CID | Placeholder
}>

export type BlurInvocation = TemplateInvocation<[CID | Placeholder, number]>
export type BlurOptions = InvocationOptions<{
  data: CID | Placeholder
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

export interface WorkflowContext {
  needs: Record<
    string,
    {
      output?: {
        'await/ok': { '/': string }
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
  ? Task
  : T