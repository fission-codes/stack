import { WebSocketServer } from 'ws'

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
 * @type {import("ws").WebSocketServer}
 */
let server

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
    },

    async afterTests() {
      for (const client of server.clients) {
        client.terminate()
      }
      server.removeAllListeners()
      server.close()
    },
  }
}

export default buildConfig
