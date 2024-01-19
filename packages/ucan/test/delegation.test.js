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
    audience: audience.did,
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
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.ok(ucan.toJSON())
})

test('should default expire', async function () {
  const signer = await EdDSASigner.generate()
  const audience = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.equal(ucan.expiration, null)
})

test('should default should not expire', async function () {
  const signer = await EdDSASigner.generate()
  const audience = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
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
    audience: audience.did,
    ttl: 30,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  assert.equal(ucan.expiration, now() + 30)
})

test('should delegate', async function () {
  const signer1 = await EdDSASigner.generate()
  const signer2 = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer1,
    audience: signer2.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  const ucan2 = await UCAN.create({
    issuer: signer2,
    audience: 'did:web:example.com',
    capabilities: { [signer1.toString()]: { '*': [{}] } },
    proofs: [ucan.cid],
  })

  assert.deepEqual(ucan2.proofs, [ucan.cid])
})

test('should delegate from jwt', async function () {
  const signer1 = await EdDSASigner.generate()
  const signer2 = await EdDSASigner.generate()

  const ucan = await UCAN.create({
    issuer: signer1,
    audience: signer2.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  const jwt = ucan.toString()
  const proof = await UCAN.fromUcan(jwt)

  const ucan2 = await UCAN.create({
    issuer: signer2,
    audience: 'did:web:example.com',
    capabilities: { [signer1.toString()]: { '*': [{}] } },
    proofs: [proof.cid],
  })

  assert.deepEqual(ucan2.proofs, [proof.cid])
})
