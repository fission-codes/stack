import { z } from 'zod'
import { Invocation, Task } from '../schemas.js'

export const placeholderRegex = /{{\s*(?:([\w.]+)|([\w.]+):(\w+))\s*}}/g

/**
 * Workflow Schema
 */
export const Workflow = z.object({
  name: z.string(),
  workflow: z.object({
    tasks: z.array(Invocation),
  }),
})

export const Placeholder =
  /** @type {typeof z.custom<import('./types.js').Placeholder>} */ (z.custom)(
    (val) => {
      return typeof val === 'string' ? placeholderRegex.test(val) : false
    }
  )

export const TemplateTask = Task.extend({
  name: z.string(),
  needs: z.string().or(z.array(z.string())).optional(),
})

export const TemplateInvocation = Invocation.extend({
  run: TemplateTask,
})

export const TemplateWorkflow = Workflow.extend({
  workflow: z.object({
    tasks: z.array(TemplateInvocation),
  }),
})
