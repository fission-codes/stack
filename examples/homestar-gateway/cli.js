#!/usr/bin/env node

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { gracefulExit } from 'exit-hook'
import sade from 'sade'
import { Agent } from '@fission-codes/ucan/agent'
import { FileDriver } from 'iso-kv/drivers/file.js'
import { EdDSASigner } from 'iso-signatures/signers/eddsa.js'
import { Client } from '@fission-codes/client'

// import { dev } from './src/dev.js'

// Handle any uncaught errors
process.once(
  'uncaughtException',
  (/** @type {Error} */ err, /** @type {string} */ origin) => {
    if (!origin || origin === 'uncaughtException') {
      console.error(err)
      gracefulExit(1)
    }
  }
)
process.once('unhandledRejection', (err) => {
  console.error(err)
  gracefulExit(1)
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// TODO change to https://github.com/sindresorhus/env-paths
const CONFIG_PATH = path.join(__dirname, 'config')

const prog = sade('gateway')
  .option('--config', 'config file path', CONFIG_PATH)
  .option('--server', 'server url', 'http://localhost:3000')

// prog
//   .command('dev')
//   .option('--fn', 'ts file path')
//   .option('--ipfsPort', 'ipfs port', 5001)
//   .action(async (/** @type {import('./src/types.ts').ConfigDev} */ opts) => {
//     try {
//       await fs.mkdir(CONFIG_PATH, { recursive: true })

//       await dev(opts)
//     } catch (error) {
//       console.error(error)
//       gracefulExit(1)
//     }
//   })

const resolveSigner = (
  /** @type {string | CryptoKeyPair | undefined} */ exported
) => {
  if (typeof exported === 'string') {
    return EdDSASigner.import(exported)
  }

  return EdDSASigner.generate()
}
prog.command('login').action(async (opts) => {
  const agent = await Agent.create({
    driver: new FileDriver({
      cwd: CONFIG_PATH,
    }),
    resolveSigner,
  })

  const client = await Client.create({
    url: opts.server,
    agent,
  })
})
prog.parse(process.argv)
