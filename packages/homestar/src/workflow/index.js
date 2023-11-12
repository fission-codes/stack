/* eslint-disable unicorn/no-null */
import { CID } from 'multiformats/cid'
import * as codec from '@ipld/dag-cbor'
import { sha3256 } from '@multiformats/sha3'

import { parse } from './template.js'
import { TemplateWorkflow } from './schemas.js'

/**
 * @typedef {import('./types.js').TemplateWorkflow} TemplateWorkflow
 * @typedef {import('./types.js').Workflow} Workflow
 * @typedef {import('./types.js').WorkflowContext} WorkflowContext
 *
 * @typedef {import('./types.js').CropInvocation} CropInvocation
 * @typedef {import('./types.js').GrayscaleInvocation} GrayscaleInvocation
 * @typedef {import('./types.js').Rotate90Invocation} Rotate90Invocation
 * @typedef {import('./types.js').BlurInvocation} BlurInvocation
 * @typedef {import('./types.js').AddOneInvocation} AddOneInvocation
 * @typedef {import('./types.js').AppendStringInvocation} AppendStringInvocation
 * @typedef {import('./types.js').JoinStringsInvocation} JoinStringsInvocation
 * @typedef {import('./types.js').TransposeInvocation} TransposeInvocation
 *
 * @typedef {import('./types.js').InvocationOptions} InvocationOptions
 * @typedef {import('./types.js').CropOptions} CropOptions
 * @typedef {import('./types.js').GrayscaleOptions} GrayscaleOptions
 * @typedef {import('./types.js').Rotate90Options} Rotate90Options
 * @typedef {import('./types.js').BlurOptions} BlurOptions
 * @typedef {import('./types.js').AddOneOptions} AddOneOptions
 * @typedef {import('./types.js').AppendStringOptions} AppendStringOptions
 * @typedef {import('./types.js').JoinStringsOptions} JoinStringsOptions
 * @typedef {import('./types.js').TransposeOptions} TransposeOptions
 */

/**
 * Build a workflow from a template
 *
 * @param {TemplateWorkflow} template
 * @returns {Promise<Workflow>}
 */
export async function workflow(template) {
  TemplateWorkflow.parse(template)
  /** @type {Set<import('../schemas.js').Task>} */
  const parsedTasks = new Set()
  /** @type {WorkflowContext} */
  const context = {
    needs: {},
    cid: (cid) => {
      return CID.parse(cid)
    },
  }

  for (const invocation of template.workflow.tasks) {
    const task = invocation.run
    const out = parse(
      {
        input: task.input,
        nnc: task.nnc,
        op: task.op,
        rsc: task.rsc,
      },
      context
    )
    const { cid, task: taskParsed } = await cidFromTask(out)

    if (!context.needs[task.name]) {
      context.needs[task.name] = {}
    }
    context.needs[task.name].output = {
      'await/ok': cid,
    }

    parsedTasks.add(taskParsed)
  }

  /** @type {import('../schemas.js').Invocation[]} */
  const tasks = [...parsedTasks].map((task, index) => {
    return {
      ...template.workflow.tasks[index],
      run: task,
    }
  })

  return {
    name: template.name,
    workflow: {
      tasks,
    },
  }
}

/**
 * @param {CropOptions} opts
 * @returns {CropInvocation}
 */
export function crop(opts) {
  return baseInvocation(opts, 'crop', [
    opts.args.data,
    opts.args.x,
    opts.args.y,
    opts.args.width,
    opts.args.height,
  ])
}

/**
 * @param {CropOptions} opts
 * @returns {CropInvocation}
 */
export function cropBase64(opts) {
  return baseInvocation(opts, 'crop-base64', [
    opts.args.data,
    opts.args.x,
    opts.args.y,
    opts.args.width,
    opts.args.height,
  ])
}

/**
 *
 * @param {GrayscaleOptions} opts
 * @returns {GrayscaleInvocation}
 */
export function grayscale(opts) {
  return baseInvocation(opts, 'grayscale', [opts.args.data])
}

/**
 *
 * @param {GrayscaleOptions} opts
 * @returns {GrayscaleInvocation}
 */
export function grayscaleBase64(opts) {
  return baseInvocation(opts, 'grayscale-base64', [opts.args.data])
}

/**
 *
 * @param {Rotate90Options} opts
 * @returns {Rotate90Invocation}
 */
export function rotate90(opts) {
  return baseInvocation(opts, 'rotate90', [opts.args.data])
}

/**
 *
 * @param {Rotate90Options} opts
 * @returns {Rotate90Invocation}
 */
export function rotate90Base64(opts) {
  return baseInvocation(opts, 'rotate90-base64', [opts.args.data])
}

/**
 *
 * @param {BlurOptions} opts
 * @returns {BlurInvocation}
 */
export function blur(opts) {
  return baseInvocation(opts, 'blur', [opts.args.data, opts.args.sigma])
}

/**
 *
 * @param {BlurOptions} opts
 * @returns {BlurInvocation}
 */
export function blurBase64(opts) {
  return baseInvocation(opts, 'blur-base64', [opts.args.data, opts.args.sigma])
}

/**
 *
 * @param {AddOneOptions} opts
 * @returns {AddOneInvocation}
 */
export function addOne(opts) {
  return baseInvocation(opts, 'add-one', [opts.args.a])
}

/**
 *
 * @param {AppendStringOptions} opts
 * @returns {AppendStringInvocation}
 */
export function appendString(opts) {
  return baseInvocation(opts, 'append-string', [opts.args.a])
}

/**
 *
 * @param {JoinStringsOptions} opts
 * @returns {JoinStringsInvocation}
 */
export function joinStrings(opts) {
  return baseInvocation(opts, 'join-strings', [opts.args.a, opts.args.b])
}

/**
 *
 * @param {TransposeOptions} opts
 * @returns {TransposeInvocation}
 */
export function transpose(opts) {
  return baseInvocation(opts, 'transpose', [opts.args.matrix])
}

/**
 * Base invocation
 *
 * @template {any[]} Args
 * @param {InvocationOptions} opts
 * @param {string} func
 * @param {Args} args
 * @returns {import('./types').TemplateInvocation<Args>}
 */
function baseInvocation(opts, func, args) {
  return {
    cause: null,
    meta: {
      memory: 4_294_967_296,
      time: 100_000,
    },
    prf: [],
    run: {
      name: opts.name,
      needs: opts.needs,
      input: {
        args,
        func,
      },
      nnc: '',
      op: 'wasm/run',
      rsc: 'ipfs://' + opts.resource,
    },
  }
}

/**
 * Generate CID from task and stringify cids
 *
 * @param {import('../schemas.js').Task} task
 * @returns {Promise<{ cid: CID, task: import('../schemas.js').Task }>}
 */
async function cidFromTask(task) {
  const dag = codec.encode(task)
  const hash = await sha3256.digest(dag)
  const cid = CID.create(1, codec.code, hash)

  return { cid, task: JSON.parse(JSON.stringify(task)) }
}
