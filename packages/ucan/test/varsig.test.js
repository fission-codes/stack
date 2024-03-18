import { assert, suite } from 'playwright-test/taps'
import { varint } from 'iso-base/varint'
import { ALG, ENCODING, VARSIG, decode, encode } from '../src/varsig.js'

const { test } = suite('varsig')

test('should encode es384 cbor', async function () {
  const out = encode({
    encoding: 'DAG-CBOR',
    alg: 'ES384',
  })

  const varsig = varint.decode(out)
  const alg = varint.decode(out, varsig[1])
  const hash = varint.decode(out, varsig[1] + alg[1])
  const enc = varint.decode(out, varsig[1] + alg[1] + hash[1])

  assert.equal(varsig[0], VARSIG)
  assert.equal(alg[0], 0x12_01)
  assert.equal(hash[0], 0x20)
  assert.equal(enc[0], ENCODING['DAG-CBOR'])
})

test('should encode rs256 cbor', async function () {
  const out = encode({
    encoding: 'DAG-CBOR',
    alg: 'RS256',
  })

  const varsig = varint.decode(out)
  const alg = varint.decode(out, varsig[1])
  const hash = varint.decode(out, varsig[1] + alg[1])
  const size = varint.decode(out, varsig[1] + alg[1] + hash[1])
  const enc = varint.decode(out, varsig[1] + alg[1] + hash[1] + size[1])

  assert.equal(varsig[0], VARSIG)
  assert.equal(alg[0], ALG.RS256)
  assert.equal(hash[0], 0x12)
  assert.equal(size[0], 0x01_00)
  assert.equal(enc[0], ENCODING['DAG-CBOR'])

  assert.equal(out.length, varsig[1] + alg[1] + hash[1] + size[1] + enc[1])
})

test('should decode', async function () {
  const header = {
    encoding: 'JWT',
    alg: 'RS256',
  }
  // @ts-ignore
  const out = encode(header)

  assert.deepEqual(decode(out), header)
})
