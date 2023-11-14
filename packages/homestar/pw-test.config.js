import path from 'path'
import fs from 'fs/promises'
import { WebSocketServer } from 'ws'
import { GenericContainer } from 'testcontainers'
import { execa } from 'execa'
import { temporaryDirectory } from 'tempy'

/**
 * @type {import("ws").WebSocketServer}
 */
let server

/**
 * @type {import('testcontainers').StartedTestContainer}')}
 */
let container

/**
 * @type {import('execa').ExecaChildProcess}')}
 */
let hs1

/**
 * @type {import('execa').ExecaChildProcess}')}
 */
let hs2

/** @type {import('playwright-test').RunnerOptions} */
const config = {
  async beforeTests(env) {
    server = new WebSocketServer({
      port: 8082,
    })

    server.on('connection', (socket, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`)
      // const query = url.searchParams

      if (url.pathname.startsWith('/notify')) {
        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'notify',
            params: ['notify'],
          })
        )
      }

      socket.on('error', console.error)

      socket.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        if (url.pathname.startsWith('/echo')) {
          return socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              result: msg.params[0],
              id: msg.id,
            })
          )
        }
        if (url.pathname.startsWith('/null-id')) {
          return socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              result: msg.params[0],
              // eslint-disable-next-line unicorn/no-null
              id: null,
            })
          )
        }

        if (url.pathname.startsWith('/timeout')) {
          // delay response
        }
      })
    })

    // Start IPFS
    container = await new GenericContainer('ipfs/kubo:latest')
      .withExposedPorts(8080)
      .withExposedPorts(5001)
      .withEnvironment({
        IPFS_PROFILE: 'test',
      })
      .start()

    await container.exec([
      'ipfs',
      'config',
      '--json',
      'API.HTTPHeaders.Access-Control-Allow-Origin',
      `["*"]`,
    ])

    await container.restart()
    const httpPort = container.getMappedPort(5001)

    env.IPFS_PORT = httpPort

    // Start Homestar
    const dir = temporaryDirectory()
    const workflow1 = path.join(dir, 'test_workflow1.toml')
    const db1 = path.join(dir, 'homestar1.db')
    await fs.writeFile(
      workflow1,
      `
[monitoring]
process_collector_interval = 500
console_subscriber_port = 5600


[node]

[node.network]
metrics_port = 4060
events_buffer_len = 1000
rpc_port = 9840
webserver_port = 8060

[node.network.ipfs]
host = '127.0.0.1'
port = ${httpPort}
    `
    )
    hs1 = execa('homestar', ['start', '-c', workflow1, '--db', db1], {
      // stdio: 'pipe',
      preferLocal: true,
      // env: {
      //   RUST_LOG: 'homestar=debug,homestar_runtime=debug',
      // },
    })

    const dir2 = temporaryDirectory()
    const workflow2 = path.join(dir2, 'test_workflow2.toml')
    const db2 = path.join(dir2, 'homestar2.db')
    await fs.writeFile(
      workflow2,
      `
[monitoring]
process_collector_interval = 500
console_subscriber_port = 5600


[node]

[node.network]
metrics_port = 4070
events_buffer_len = 1000
rpc_port = 9850
webserver_port = 8070

[node.network.ipfs]
host = '127.0.0.1'
port = ${httpPort}
    `
    )
    hs2 = execa('homestar', ['start', '-c', workflow2, '--db', db2], {
      // stdio: 'inherit',
      preferLocal: true,
    })
  },

  async afterTests() {
    for (const client of server.clients) {
      client.terminate()
    }
    server.removeAllListeners()
    server.close()
    hs1.kill()
    hs2.kill()

    await container.stop()
  },
}

export default config
