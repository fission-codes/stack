import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { execa } from 'execa'
import { request } from 'iso-web/http'
import { temporaryDirectory } from 'tempy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Build a config file for the server
 *
 * @param {string} dbURL
 * @param {string} keypairPath
 */
function serverConfig(dbURL, keypairPath) {
  return `
[database]
url = "${dbURL}"
connect_timeout = 3

[healthcheck]
enabled = false
interval_ms = 5000
max_retries = 3

[ipfs]
peers = [
  "/ip4/127.0.0.1/tcp/4002/ws/p2p/12D3KooWLXH5BFzscChpdjtotAvv94hDR6bVxMKLHBHrSnugCRWs",
  "/ip4/127.0.0.1/udp/4001/quic-v1/webtransport/certhash/uEiC4_sAMUfcxEJtqIlVWRGlHrTSSYuyk5Ulqfl6CjRiOHw/certhash/uEiANUHX9dRBqphQzZINo5WzkStJ7qevCr_2ZAUzLEbqoFw/p2p/12D3KooWLXH5BFzscChpdjtotAvv94hDR6bVxMKLHBHrSnugCRWs"
]

[mailgun]
api_key = 0
sender_address = "noreply@mail.fission.codes"
sender_name = "Fission"
domain = "mail.fission.codes"
subject = "Your Fission Verification Code"
from_address = "noreply@mail.fission.codes"
from_name = "Fission"
template = "test-email-verification"

[monitoring]
process_collector_interval = 10

[otel]
exporter_otlp_endpoint = "http://localhost:4317"

[dns]
server_port = 1053
default_soa = "dns1.fission.systems hostmaster.fission.codes 0 10800 3600 604800 3600"
default_ttl = 1800
origin = "localhost" 
users_origin = "localhost"

[server]
environment = "local"
keypair_path = "${keypairPath}"
metrics_port = 4000
port = 3000
timeout_ms = 30000  
`
}

/**
 * @type {import('@testcontainers/postgresql').StartedPostgreSqlContainer}')}
 */
let container

/**
 * @type {import('execa').ExecaChildProcess}')}
 */
let server

/**
 * @param {import('playwright-test').RunnerOptions} config
 * @returns {import('playwright-test').RunnerOptions}
 */
function buildConfig(config) {
  return {
    buildConfig: {
      // bundle: config.mode !== 'node',
    },
    async beforeTests(env) {
      container = await new PostgreSqlContainer().start()
      const dir = temporaryDirectory()
      const dbURL = container.getConnectionUri()
      const keypairPath = `${dir}/server.ed25519.pem`
      const settingsPath = `${dir}/settings.toml`

      await fs.writeFile(settingsPath, serverConfig(dbURL, keypairPath))

      const bin = process.env.CI
        ? path.join(__dirname, 'test/mocks/fission-server-ci')
        : path.join(__dirname, 'test/mocks/fission-server')

      server = execa(
        bin,
        [
          '--ephemeral-db',
          '--close-on-stdin-close',
          '--gen-key-if-needed',
          '--config-path',
          settingsPath,
        ],
        {
          env: {
            RUST_LOG: 'fission_server=info',
          },
          // stdio: 'pipe',
        }
      )
      server.stderr.on('data', (data) => {
        console.error(data.toString())
      })

      server.stdout.on('data', (data) => {
        // eslint-disable-next-line no-console
        console.log(data.toString())
      })

      const { error } = await request.json(
        'http://localhost:3000/healthcheck',
        {
          retry: {
            retries: 10,
            onFailedAttempt: (error) => {
              console.error('Failed to connect to server', error)
            },
          },
        }
      )

      if (error) {
        // eslint-disable-next-line no-console
        console.log('🚀 ~ beforeTests ~ error:', error)
        throw error
      }

      env.SERVER_URL = 'http://localhost:3000'
    },

    async afterTests() {
      await container.stop()

      server.kill()
      // server.kill()
    },
  }
}

export default buildConfig
