import path from 'path'
import fs from 'fs/promises'
import { WebSocketServer } from 'ws'
import { GenericContainer } from 'testcontainers'
import { execa } from 'execa'
import { temporaryDirectory } from 'tempy'

/**
 * Start IPFS container
 */
async function startIPFS() {
  const container = await new GenericContainer('ipfs/kubo:latest')
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

  return { container, httpPort }
}

/**
 * Start WS server
 */
function startWs() {
  const server = new WebSocketServer({
    port: 8082,
  })

  server.on('connection', (socket, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`)

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

  return server
}

/**
 * Start Homestar
 *
 * @param {number} httpPort
 */
async function startHomestar(httpPort) {
  // Start Homestar
  const dir = temporaryDirectory()
  const config1 = path.join(dir, 'test_workflow1.toml')
  const db1 = path.join(dir, 'homestar1.db')
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
port = ${httpPort}
    `
  )

  hs1 = execa('homestar', ['start', '-c', config1, '--db', db1], {
    preferLocal: true,
    // stdio: 'inherit',
    env: {
      RUST_LOG: 'none',
    },
  })

  const dir2 = temporaryDirectory()
  const config2 = path.join(dir2, 'test_workflow2.toml')
  const db2 = path.join(dir2, 'homestar2.db')
  await fs.writeFile(
    config2,
    `
[node]
[node.network.metrics]
port = 4030

[node.network.rpc]
port = 9830

[node.network.webserver]
port = 8030

[node.network.ipfs]
port = ${httpPort}
    `
  )
  hs2 = execa('homestar', ['start', '-c', config2, '--db', db2], {
    preferLocal: true,
    env: {
      RUST_LOG: 'none',
    },
  })

  return {
    hs1,
    hs2,
    hs1Url: 'ws://127.0.0.1:8020',
    hs2Url: 'ws://127.0.0.1:8030',
  }
}
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

/**
 * @param {import('playwright-test').RunnerOptions} config
 * @returns {import('playwright-test').RunnerOptions}
 */
function buildConfig(config) {
  return {
    buildConfig: {
      bundle: config.mode !== 'node',
    },
    async beforeTests(env) {
      // Start WS server
      server = startWs()

      // Start IPFS
      const { container: ipfsContainer, httpPort } = await startIPFS()
      container = ipfsContainer
      env.IPFS_PORT = `${httpPort}`

      const hs = await startHomestar(httpPort)
      env.HS1_URL = hs.hs1Url
      env.HS2_URL = hs.hs2Url

      hs1 = hs.hs1
      hs2 = hs.hs2
    },

    async afterTests() {
      await container.stop()
      for (const client of server.clients) {
        client.terminate()
      }
      server.removeAllListeners()
      server.close()
      hs1.kill('SIGTERM', {
        forceKillAfterTimeout: 100,
      })
      hs2.kill('SIGTERM', {
        forceKillAfterTimeout: 100,
      })
    },
  }
}

export default buildConfig
