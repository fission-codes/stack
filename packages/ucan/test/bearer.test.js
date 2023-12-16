import { assert, suite } from 'playwright-test/taps'
import { EdDSASigner } from 'iso-signatures/signers/eddsa.js'
import { UCAN } from '../src/index.js'

import * as Bearer from '../src/bearer.js'

// eslint-disable-next-line no-unused-vars
import * as T from '../src/types.js'

const test = suite('bearer')

const signer = await EdDSASigner.generate()
const audience = await EdDSASigner.generate()
const ucan1 = await UCAN.create({
  issuer: signer,
  audience: audience.did,
  capabilities: { 'ucan:*': { '*': [{}] } },
})

const ucan2 = await UCAN.create({
  issuer: signer,
  audience: audience.did,
  nonce: 'ucan2',
  capabilities: { 'ucan:*': { '*': [{}] } },
})

/** @type {Map<string, T.IUcan>} */
const store = new Map()

store.set(ucan1.cid.toString(), ucan1)
store.set(ucan2.cid.toString(), ucan2)

test('should encode valid headers', async function () {
  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
    proofs: [ucan1.cid, ucan2.cid],
  })

  const headers = Bearer.encode(ucan, store)

  assert.deepEqual(headers, {
    authorization: `Bearer ${ucan.toString()}`,
    ucans: `${ucan1.toString()}, ${ucan2.toString()}`,
  })
})

test('should encode dedup proofs', async function () {
  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
    proofs: [ucan1.cid, ucan1.cid],
  })

  const headers = Bearer.encode(ucan, store)

  assert.deepEqual(headers, {
    authorization: `Bearer ${ucan.toString()}`,
    ucans: `${ucan1.toString()}`,
  })
})

test('should encode not have ucans without proofs', async function () {
  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  const headers = Bearer.encode(ucan, store)

  assert.deepEqual(headers, {
    authorization: `Bearer ${ucan.toString()}`,
  })
})

test('should encode works with native Headers', async function () {
  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
  })

  const headers = Bearer.encode(ucan, store)
  const h1 = new Headers(headers)

  // @ts-expect-error Headers does have entries
  assert.deepEqual(headers, Object.fromEntries(h1.entries()))

  const h2 = new Headers()

  h2.set('authorization', headers.authorization)
  if (headers.ucans) {
    h2.set('ucans', headers.ucans)
  }
  // @ts-expect-error Headers does have entries
  assert.deepEqual(headers, Object.fromEntries(h2.entries()))
})

test('should decode', async function () {
  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
    proofs: [ucan1.cid, ucan2.cid],
  })

  const headers = Bearer.encode(ucan, store)
  const out = await Bearer.decode(headers)

  assert.equal(out.ucan.toString(), ucan.toString())
  assert.equal(out.proofs.size, 2)
  assert.equal(out.missing.length, 0)
})

test('should decode and return missing', async function () {
  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
    proofs: [ucan1.cid, ucan2.cid],
  })

  /** @type {Map<string, T.IUcan>} */
  const store = new Map()

  store.set(ucan1.cid.toString(), ucan1)
  const headers = Bearer.encode(ucan, store)
  const out = await Bearer.decode(headers)

  assert.equal(out.ucan.toString(), ucan.toString())
  assert.equal(out.proofs.size, 1)
  assert.equal(out.missing[0].toString(), ucan2.cid.toString())
})

test('should decode Headers', async function () {
  const ucan = await UCAN.create({
    issuer: signer,
    audience: audience.did,
    capabilities: { 'ucan:*': { '*': [{}] } },
    proofs: [ucan1.cid, ucan2.cid],
  })

  const headers = new Headers(Bearer.encode(ucan, store))
  const out = await Bearer.decode(headers)

  assert.equal(out.ucan.toString(), ucan.toString())
  assert.equal(out.proofs.size, 2)
  assert.equal(out.missing.length, 0)
})
