import { assert, suite } from 'playwright-test/taps'
import { EdDSASigner } from 'iso-signatures/signers/eddsa.js'
import { ECDSASigner } from 'iso-signatures/signers/ecdsa.js'
import { MemoryDriver } from 'iso-kv/drivers/memory.js'
import { RSASigner } from 'iso-signatures/signers/rsa.js'
import { Agent } from '../src/agent.js'

const test = suite('agent')

const resolverEdOrEC = (
  /** @type {string | CryptoKeyPair | undefined} */ exported
) => {
  if (typeof exported === 'string') {
    return EdDSASigner.import(exported)
  }

  if (typeof exported === 'object') {
    return ECDSASigner.import(exported)
  }

  return ECDSASigner.generate('ES256')
}

const resolverRSA = (
  /** @type {string | CryptoKeyPair | undefined} */ exported
) => {
  if (typeof exported === 'object') {
    return RSASigner.import(exported)
  }

  return RSASigner.generate()
}

test('should create', async function () {
  const agent = await Agent.create({
    resolveSigner: resolverEdOrEC,
  })

  assert.ok(agent)
})

test('should fail with mismatch', async function () {
  const driver = new MemoryDriver()
  await Agent.create({
    driver,
    resolveSigner: resolverEdOrEC,
  })

  assert.rejects(
    async () => {
      await Agent.create({
        driver,
        resolveSigner: resolverRSA,
      })
    },
    {
      message: 'Signer resolver mismatch.',
    }
  )
})

test('should recreate', async function () {
  const driver = new MemoryDriver()
  const agent1 = await Agent.create({
    driver,
    resolveSigner: resolverEdOrEC,
  })

  const agent2 = await Agent.create({
    driver,
    resolveSigner: resolverEdOrEC,
  })

  assert.deepEqual(agent1.signer.did, agent2.signer.did)
})
