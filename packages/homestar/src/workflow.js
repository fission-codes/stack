import { CID } from 'multiformats/cid'
import * as codec from '@ipld/dag-cbor'
import { sha3256 } from '@multiformats/sha3'

import { parse } from './template.js'

/* eslint-disable unicorn/no-null */
/**
 * @param {import('./types.js').TemplateWorkflow} template
 * @returns {Promise<import('./schemas.js').Workflow>}
 */
export async function workflow(template) {
  /** @type {Set<import('./schemas.js').Task>} */
  const parsedTasks = new Set()
  /** @type { import('./types.js').WorkflowContext} */
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
      'await/ok': cid.toJSON(),
    }

    const r = parse(taskParsed, context)

    parsedTasks.add(r)
  }

  /** @type {import('./schemas.js').Invocation[]} */
  const _tasks = [...parsedTasks].map((task, index) => {
    return {
      ...template.workflow.tasks[index],
      run: task,
    }
  })

  return {
    name: template.name,
    workflow: {
      tasks: _tasks,
    },
  }
}

/**
 * @param {import('./types.js').CropOptions} opts
 * @returns {import('./types.js').CropInvocation}
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
 *
 * @param {import('./types.js').GrayscaleOptions} opts
 * @returns {import('./types.js').GrayscaleInvocation}
 */
export function grayscale(opts) {
  return baseInvocation(opts, 'grayscale', [opts.args.data])
}

/**
 *
 * @param {import('./types.js').Rotate90Options} opts
 * @returns {import('./types.js').Rotate90Invocation}
 */
export function rotate90(opts) {
  return baseInvocation(opts, 'rotate90', [opts.args.data])
}

/**
 *
 * @param {import('./types.js').BlurOptions} opts
 * @returns {import('./types.js').BlurInvocation}
 */
export function blur(opts) {
  return baseInvocation(opts, 'blur', [opts.args.data, opts.args.sigma])
}

/**
 *
 * @param {import('./types.js').AddOneOptions} opts
 * @returns {import('./types.js').AddOneInvocation}
 */
export function addOne(opts) {
  return baseInvocation(opts, 'add-one', [opts.args.a])
}

/**
 *
 * @param {import('./types.js').AppendStringOptions} opts
 * @returns {import('./types.js').AppendStringInvocation}
 */
export function appendString(opts) {
  return baseInvocation(opts, 'append-string', [opts.args.a])
}

/**
 *
 * @param {import('./types.js').JoinStringsOptions} opts
 * @returns {import('./types.js').JoinStringsInvocation}
 */
export function joinStrings(opts) {
  return baseInvocation(opts, 'join-strings', [opts.args.a, opts.args.b])
}

/**
 *
 * @param {import('./types.js').TransposeOptions} opts
 * @returns {import('./types.js').TransposeInvocation}
 */
export function transpose(opts) {
  return baseInvocation(opts, 'transpose', [opts.args.matrix])
}

/**
 * Base invocation
 *
 * @template {any[]} Args
 * @param {import('./types.js').InvocationOptions} opts
 * @param {string} func
 * @param {Args} args
 * @returns {import('./types.js').TemplateInvocation<Args>}
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
      rsc: opts.resource,
    },
  }
}

/**
 * Generate CID from task and stringify cids
 *
 * @param {import('./schemas.js').Task} task
 * @returns {Promise<{ cid: CID, task: import('./schemas.js').Task }>}
 */
async function cidFromTask(task) {
  const dag = codec.encode(task)
  const hash = await sha3256.digest(dag)
  const cid = CID.create(1, codec.code, hash)

  return { cid, task: JSON.parse(JSON.stringify(task)) }
}
