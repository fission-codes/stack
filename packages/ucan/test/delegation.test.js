/* eslint-disable unicorn/no-null */
import { assert, suite } from 'playwright-test/taps'
import { EdDSASigner } from 'iso-signatures/signers/eddsa.js'
import { Resolver } from 'iso-signatures/verifiers/resolver.js'
import * as EdDSA from 'iso-signatures/verifiers/eddsa.js'
import { UCAN } from '../src/index.js'

const test = suite('delegation')
const now = () => Math.floor(Date.now() / 1000)

test('should generate valid jwt', async function () {
  const signer = await EdDSASigner.generate()
  const audience = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer,
    audience,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.ok(
    await ucan.isValid(
      new Resolver({
        ...EdDSA.verifier,
      })
    )
  )

  const ucan2 = await UCAN.fromUcan(ucan.toString())

  assert.equal(ucan.toString(), ucan2.toString())
})

test('should generate valid json', async function () {
  const signer = await EdDSASigner.generate()
  const audience = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer,
    audience,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.ok(ucan.toJSON())
})

test('should default expire', async function () {
  const signer = await EdDSASigner.generate()
  const audience = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer,
    audience,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.equal(ucan.expiration, null)
})

test('should default should not expire', async function () {
  const signer = await EdDSASigner.generate()
  const audience = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer,
    audience,
    expiration: 0,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.equal(ucan.expiration, 0)
})

test('should default should expire with ttl', async function () {
  const signer = await EdDSASigner.generate()
  const audience = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer,
    audience,
    ttl: 30,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.equal(ucan.expiration, now() + 30)
})
