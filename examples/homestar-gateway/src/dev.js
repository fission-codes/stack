import path from 'path'
import fs from 'fs/promises'
import { execa } from 'execa'
import pDefer from 'p-defer'
import { validator } from 'hono/validator'
import { Homestar } from '@fission-codes/homestar'
import { invocation, workflow } from '@fission-codes/homestar/workflow'
import { WebsocketTransport } from '@fission-codes/channel/transports/ws.js'
import { gracefulExit } from 'exit-hook'
import { create } from 'kubo-rpc-client'
import ora from 'ora'
import { createGenerator } from 'ts-json-schema-generator'

import { build } from '@fission-codes/homestar/wasmify'
import { listen } from 'listhen'
import Ajv from 'ajv'
import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'

/**
 * Add file to IPFS
 *
 * @param {string} path - path to file ie. '/small.png'
 * @param {number} port
 */
export async function addFSFileToIPFS(path, port) {
  const ipfs = create({
    port,
  })

  const file = await ipfs.add(
    {
      content: await fs.readFile(path),
    },
    {
      cidVersion: 1,
    }
  )

  return file.cid
}

/**
 *
 * @param {import('./types.js').ConfigDev} opts
 */
export async function dev(opts) {
  const spinner = ora('Compiling JS function to Wasm').start()
  const fnPath = path.resolve(opts.fn)
  const wasmPath = await build(fnPath, opts.config)
  /** @type {import('ts-json-schema-generator').Config} */
  const config = {
    path: path.resolve(opts.fn),
    // tsconfig: path.join(__dirname, '/tsconfig.json'),
    // type: '*', // Or <type-name> if you want to generate schema for that one type only
  }

  const schema = createGenerator(config).createSchema(config.type)
  // @ts-ignore
  const entries = Object.entries(schema.definitions).map(([k, v]) => [
    k.replaceAll('NamedParameters<typeof ', '').replaceAll('>', ''),
    v,
  ])
  spinner.succeed('Compiled JS function to Wasm')

  spinner.start('Starting Homestar')
  const config1 = path.join(opts.config, 'workflow.toml')
  const db1 = path.join(opts.config, 'homestar.db')
  await fs.writeFile(
    config1,
    `
[node]
[node.network.metrics]
port = 4020

[node.network.rpc]
port = 9820

[node.network.webserver]
port = 8020

[node.network.ipfs]
port = ${opts.ipfsPort}
    `
  )

  execa('homestar', ['start', '-c', config1, '--db', db1], {
    preferLocal: true,
    env: {
      RUST_LOG: 'none',
    },
  })

  const hs = new Homestar({
    transport: new WebsocketTransport('ws://localhost:8020'),
  })

  const health = await hs.health()
  if (health.error) {
    console.error('❌ Homestar is not healthy')
    return gracefulExit(1)
  }
  spinner.succeed(`Homestar is running at localhost:8020`)

  const cid = await addFSFileToIPFS(wasmPath.outPath, opts.ipfsPort)

  /** @type {Hono<{Variables: {name: string, schema: import('ajv').SchemaObject}}>} */
  const app = new Hono()

  app.get('/', async (c) => {
    return c.json(entries, 200)
  })

  app.use('/:id/*', async (c, next) => {
    const data = entries.find((e) => e[0] === c.req.param('id'))

    if (!data) {
      return c.json({ error: 'Not found' }, 404)
    }

    const [name, schema] = data
    if (typeof schema === 'string' || typeof name !== 'string') {
      return c.json({ error: 'Schema error' }, 404)
    }

    c.set('name', name)
    c.set('schema', /** @type {import('ajv').SchemaObject} */ (schema))

    await next()
  })

  app.get('/:id/schema', async (c) => {
    return c.json(c.get('schema'), 200)
  })

  app.get(
    '/:id',
    validator('query', (value, c) => {
      const ajv = new Ajv()
      const validate = ajv.compile(c.get('schema'))
      const valid = validate(value)

      if (!valid) {
        return c.json(validate.errors, 400)
      }
      return value
    }),

    async (c) => {
      // order args by schema
      const keys = Object.keys(c.get('schema').properties)
      const args = []
      for (const key of keys) {
        args.push(c.req.query(key))
      }

      return c.text(await run(args, cid, hs, c.get('name')), 200, {
        'Content-Type': 'image/svg+xml',
      })
    }
  )

  app.get('*', (c) => c.text('not found')) // fallback

  await listen(getRequestListener(app.fetch), {
    public: true,
    // tunnel: true,
  })
}

/**
 *
 * @param {any[]} args
 * @param {{ toString: () => any; }} cid
 * @param {Homestar} hs
 * @param {string} name
 * @returns
 */
async function run(args, cid, hs, name) {
  /** @type {import('p-defer').DeferredPromise<string>} */
  const prom = pDefer()
  const workflow1 = await workflow({
    name,
    workflow: {
      tasks: [
        invocation({
          name,
          func: name,
          args,
          resource: `ipfs://${cid.toString()}`,
        }),
      ],
    },
  })
  const { error } = await hs.runWorkflow(workflow1, (data) => {
    prom.resolve(data.receipt.out[1])
  })

  if (error) {
    console.error(error)

    return error.message
  }

  return await prom.promise
}
