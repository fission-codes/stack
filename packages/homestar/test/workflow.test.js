/* eslint-disable unicorn/no-null */
import { assert, suite } from 'playwright-test/taps'
import { CID } from 'multiformats'
import * as Schemas from '../src/schemas.js'
import * as Workflow from '../src/workflow.js'
import { workflow1 } from './fixtures.js'

const test = suite('workflow')

test('should validate workflow 1', async function () {
  const workflow = {
    name: 'testtttt',
    workflow: {
      tasks: [
        {
          cause: null,
          meta: {
            memory: 4_294_967_296,
            time: 100_000,
          },
          prf: [],
          run: {
            input: {
              args: [
                {
                  '/': 'QmZ3VEcAWa2R7SQ7E1Y7Q5fL3Tzu8ijDrs3UkmF7KF2iXT',
                },
                150,
                350,
                500,
                500,
              ],
              func: 'crop',
            },
            nnc: '',
            op: 'wasm/run',
            rsc: 'ipfs://QmYtZSh2qzr8q7n6TMVDPpaecXKTjxQWBuj9n77Tccwcwp',
          },
        },
      ],
    },
  }

  const parsed = Schemas.Workflow.safeParse(workflow)
  if (parsed.success === false) {
    return assert.fail(parsed.error)
  }

  assert.deepEqual(parsed.data, workflow)
})

test('should validate workflow 2', async function () {
  const workflow = {
    name: 'workflow2',
    workflow: {
      tasks: [
        {
          cause: null,
          meta: {
            memory: 4_294_967_296,
            time: 100_000,
          },
          prf: [],
          run: {
            input: {
              args: [
                {
                  '/': 'bafybeiejevluvtoevgk66plh5t6xiy3ikyuuxg3vgofuvpeckb6eadresm',
                },
                150,
                350,
                500,
                500,
              ],
              func: 'crop',
            },
            nnc: '',
            op: 'wasm/run',
            rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
          },
        },
        {
          cause: null,
          meta: {
            memory: 4_294_967_296,
            time: 100_000,
          },
          prf: [],
          run: {
            input: {
              args: [
                {
                  'await/ok': {
                    '/': 'bafyrmigev36skyfjnslfswcez24rnrorzeaxkrpb3wci2arfkly5zcrepy',
                  },
                },
              ],
              func: 'rotate90',
            },
            nnc: '',
            op: 'wasm/run',
            rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
          },
        },
        {
          cause: null,
          meta: {
            memory: 4_294_967_296,
            time: 100_000,
          },
          prf: [],
          run: {
            input: {
              args: [
                {
                  'await/ok': {
                    '/': 'bafyrmiegkif6ofatmowjjmw7yttm7mi5pjjituoxtp5qqsmc3fw65ypbm4',
                  },
                },
              ],
              func: 'grayscale',
            },
            nnc: '',
            op: 'wasm/run',
            rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
          },
        },
      ],
    },
  }

  const parsed = Schemas.Workflow.safeParse(workflow)
  if (parsed.success === false) {
    return assert.fail(parsed.error)
  }

  assert.deepEqual(parsed.data, workflow)
})

test('should create crop task', async function () {
  const crop = {
    cause: null,
    meta: {
      memory: 4_294_967_296,
      time: 100_000,
    },
    prf: [],
    run: {
      name: 'crop',
      needs: undefined,
      input: {
        args: [
          CID.parse(
            'bafybeiejevluvtoevgk66plh5t6xiy3ikyuuxg3vgofuvpeckb6eadresm'
          ),
          150,
          350,
          500,
          500,
        ],
        func: 'crop',
      },
      nnc: '',
      op: 'wasm/run',
      rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
    },
  }

  assert.deepEqual(
    Workflow.crop({
      name: 'crop',
      resource: 'bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
      args: {
        data: CID.parse(
          'bafybeiejevluvtoevgk66plh5t6xiy3ikyuuxg3vgofuvpeckb6eadresm'
        ),
        height: 500,
        width: 500,
        x: 150,
        y: 350,
      },
    }),
    crop
  )
})

test('should workflow template', async function () {
  const work = await Workflow.workflow({
    name: 'test-template',
    workflow: {
      tasks: [
        {
          cause: null,
          meta: {
            memory: 4_294_967_296,
            time: 100_000,
          },
          prf: [],
          run: {
            name: 'crop',
            input: {
              args: [
                '{{cid:bafybeiejevluvtoevgk66plh5t6xiy3ikyuuxg3vgofuvpeckb6eadresm}}',
                150,
                350,
                500,
                500,
              ],
              func: 'crop',
            },
            nnc: '',
            op: 'wasm/run',
            rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
          },
        },
        {
          cause: null,
          meta: {
            memory: 4_294_967_296,
            time: 100_000,
          },
          prf: [],
          run: {
            name: 'grayscale',
            input: {
              args: ['{{needs.crop.output}}'],
              func: 'grayscale',
            },
            nnc: '',
            op: 'wasm/run',
            rsc: 'ipfs://bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
          },
        },
      ],
    },
  })
  assert.deepEqual(work, {
    name: 'test-template',
    workflow: workflow1,
  })
})

test('should workflow with help functions', async function () {
  const work = await Workflow.workflow({
    name: 'test-template',
    workflow: {
      tasks: [
        Workflow.crop({
          name: 'crop',
          resource:
            'bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
          args: {
            data: CID.parse(
              'bafybeiejevluvtoevgk66plh5t6xiy3ikyuuxg3vgofuvpeckb6eadresm'
            ),
            height: 500,
            width: 500,
            x: 150,
            y: 350,
          },
        }),
        Workflow.grayscale({
          name: 'grayscale',
          needs: 'crop',
          resource:
            'bafybeichafzlolnoamugvfuyynjnj2gse7avstiqkeiuwuv2gyztap4qm4',
          args: {
            data: '{{needs.crop.output}}',
          },
        }),
      ],
    },
  })
  assert.deepEqual(work, {
    name: 'test-template',
    workflow: workflow1,
  })
})
