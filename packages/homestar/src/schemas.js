import { z } from 'zod'
import { CID as _CID } from 'multiformats/cid'

/**
 * @typedef {import('zod').z.infer<typeof Receipt>} Receipt
 * @typedef {import('zod').z.infer<typeof Metrics>} Metrics
 * @typedef {import('zod').z.infer<typeof Health>} Health
 * @typedef {import('zod').z.infer<typeof Invocation>} Invocation
 * @typedef {import('zod').z.infer<typeof Task>} Task
 * @typedef {import('zod').z.infer<typeof WorkflowNotification>} WorkflowNotification
 * @typedef {import('zod').z.infer<typeof EventNotification>} EventNotification
 */

export const Metrics = z.object({
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

export const Health = z.object({
  healthy: z.boolean(),
  // nodeInfo: z.object({
  //   static: z.object({ peer_id: z.string() }),
  //   dynamic: z.object({ listeners: z.array(z.string()) }),
  // }),
})

export const CID = /** @type {typeof z.custom<import('multiformats').CID>} */ (
  z.custom
)((val) => {
  const r = _CID.asCID(val)
  return r !== null
})

/**
 * @see https://github.com/ucan-wg/invocation/?tab=readme-ov-file#8-receipt
 */
export const Receipt = z.object({
  ran: CID,
  out: z.tuple([z.literal('ok').or(z.literal('error')), z.any()]),
  fx: z.any().optional(),
  meta: z.record(z.any()),
  iss: z.string().optional().nullable(),
  prf: z.array(CID),
  s: z.any().optional(),
})

/**
 * @see https://github.com/ucan-wg/invocation/?tab=readme-ov-file#3-task
 */
export const Task = z.object({
  op: z.string(),
  rsc: z.string().url(),
  nnc: z.union([
    z.string(),
    z.object({ '/': z.object({ bytes: z.string() }) }),
  ]),
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
  prf: z.array(CID),
})

export const WorkflowMetadata = z.object({
  name: z.string(),
  replayed: z.boolean(),
  workflow: CID,
})

export const WorkflowNotification = z.object({
  metadata: WorkflowMetadata,
  receipt: Receipt,
  receipt_cid: CID,
})

export const EventNotification = z.object({
  type: z.string(),
  timestamp: z.number(),
  data: z.any(),
})
