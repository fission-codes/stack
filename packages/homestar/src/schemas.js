import { z } from 'zod'
import { CID } from 'multiformats/cid'

/**
 * @typedef {import('zod').z.infer<typeof Receipt>} Receipt
 * @typedef {import('zod').z.infer<typeof Metrics>} Metrics
 * @typedef {import('zod').z.infer<typeof Health>} Health
 * @typedef {import('zod').z.infer<typeof Invocation>} Invocation
 * @typedef {import('zod').z.infer<typeof Task>} Task
 * @typedef {import('./types.js').InferError<typeof Metrics>} MetricsError
 * @typedef {import('./types.js').InferError<typeof Health>} HealthError
 * @typedef {import('zod').z.infer<typeof WorkflowNotification>} WorkflowNotification
 * @typedef {import('./types.js').InferError<typeof WorkflowNotification>} WorkflowNotificationError
 * @typedef {import('zod').z.infer<typeof EventNotification>} EventNotification
 * @typedef {import('./types.js').InferError<typeof EventNotification>} EventNotificationError
 */

export const Metrics = z
  .object({
    metrics: z.array(
      z.object({
        metric_type: z.literal('gauge'),
        metric_name: z.string(),
        help: z.string(),
        data: z.array(
          z.object({
            type: z.string(),
            labels: z.array(z.string()).nullable(),
            value: z.coerce.number(),
          })
        ),
      })
    ),
  })
  .transform((val) => val.metrics)

export const Health = z.object({
  healthy: z.boolean(),
  nodeInfo: z.object({
    static: z.object({ peer_id: z.string() }),
    dynamic: z.object({ listeners: z.array(z.string()) }),
  }),
})

export const CIDInstance =
  /** @type {typeof z.custom<import('multiformats').Link>} */ (z.custom)(
    (val) => {
      const r = CID.asCID(val)
      return r !== null
    }
  )

/**
 * @see https://github.com/ucan-wg/invocation/?tab=readme-ov-file#8-receipt
 */
export const Receipt = z.object({
  ran: CIDInstance,
  out: z.tuple([z.literal('ok').or(z.literal('error')), z.any()]),
  fx: z.any().optional(),
  meta: z.record(z.any()),
  iss: z.string().optional().nullable(),
  prf: z.array(CIDInstance),
  s: z.any().optional(),
})

/**
 * @see https://github.com/ucan-wg/invocation/?tab=readme-ov-file#3-task
 */
export const Task = z.object({
  op: z.string(),
  rsc: z.string().url(),
  nnc: z.string(),
  input: z.object({
    func: z.string(),
    args: z.array(z.any()),
  }),
})

/**
 * @see https://github.com/ucan-wg/invocation/?tab=readme-ov-file#5-invocation
 */
export const Invocation = z.object({
  v: z.string().optional(),
  run: Task,
  cause: Receipt.optional().nullable(),
  auth: z.any().optional(),
  meta: z.record(z.any()),
  prf: z.array(CIDInstance),
})

export const WorkflowMetadata = z.object({
  name: z.string(),
  replayed: z.boolean(),
  workflow: CIDInstance,
})

export const WorkflowNotification = z.object({
  metadata: WorkflowMetadata,
  receipt: Receipt,
  receipt_cid: CIDInstance,
})

export const EventNotification = z.object({
  type: z.string(),
  timestamp: z.number(),
  data: z.any(),
})
