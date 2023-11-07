import { WebSocketServer } from 'ws'

/**
 * @type {import("ws").WebSocketServer}
 */
let server

/** @type {import('playwright-test').RunnerOptions} */
const config = {
  beforeTests() {
    server = new WebSocketServer({
      port: 8080,
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
  },

  afterTests() {
    for (const client of server.clients) {
      client.terminate()
    }
    server.removeAllListeners()
    server.close()
  },
}

export default config
