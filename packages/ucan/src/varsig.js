import { varint } from 'iso-base/varint'
import { equals } from 'iso-base/utils'
import { hex } from 'iso-base/rfc4648'

export const VARSIG = 0x34

export const ENCODING = /** @types  {const} */ {
  RAW: 0x5f,
  'DAG-PB': 0x70,
  'DAG-CBOR': 0x71,
  'DAG-JSON': 0x1_29,
  JWT: 0x6a_77,
}

/**
 * @type {Record<number, string>}
 */
export const CODE_ENCODING = /** @types  {const} */ {
  0x5f: 'RAW',
  0x70: 'DAG-PB',
  0x71: 'DAG-CBOR',
  0x1_29: 'DAG-JSON',
  0x6a_77: 'JWT',
}

export const ALG = /** @type {const} */ ({
  EdDSA: 0xed,
  RS256: 0x12_05,
  ES256: 0x12_00,
  ES384: 0x12_01,
  ES512: 0x12_02,
  ES256K: 0xe7,
})

/**
 * @type {Record<number, string>}
 */
export const CODE_ALG = /** @type {const} */ ({
  0xed: 'EdDSA',
  0x12_05: 'RS256',
  0x12_00: 'ES256',
  0x12_01: 'ES384',
  0x12_02: 'ES512',
  0xe7: 'ES256K',
})

/**
 * @param {keyof typeof ENCODING} type
 */
export function encCode(type) {
  const encCode = ENCODING[type]
  if (!encCode) {
    throw new TypeError(`Unsupported encoding ${type}`)
  }
  return encCode
}

/**
 * Varint encoding for signature algorithms and encodings.
 *
 * @type {Record<keyof typeof ENCODING | 'VARSIG' | import('iso-did/types').SignatureAlgorithm, number[]  >}
 */
const VARINT = {
  VARSIG: [52],

  RAW: [95],
  'DAG-CBOR': [113],
  'DAG-JSON': [169, 2],
  'DAG-PB': [112],
  JWT: [247, 212, 1],

  EdDSA: [237, 1],
  //      rsa   + SHA2-256 + 256
  RS256: [133, 36, 18, 128, 2],
  // secp256k1  + SHA2-256
  ES256K: [231, 1, 18],
  //     p256   + SHA2-256
  ES256: [128, 36, 18],
  //     p384   + SHA2-384
  ES384: [129, 36, 32],
  //     p512   + SHA2-512
  ES512: [130, 36, 19],
}

/**
 * @param {import('./types.js').VarsigOptions} options
 */
export function encode(options) {
  const enc = VARINT[options.encoding]
  if (!enc) {
    throw new TypeError(`Unsupported encoding ${options.encoding}`)
  }

  const alg = VARINT[options.alg]
  if (!alg) {
    throw new TypeError(`Unsupported algorithm ${options.alg}`)
  }

  return Uint8Array.from([...VARINT.VARSIG, ...alg, ...enc])
}

/**
 * Match the algorithm and encoding.
 *
 * @param {keyof typeof ALG} alg
 * @param {Uint8Array} buf
 */
function matchAlg(alg, buf) {
  const expected = Uint8Array.from([...VARINT.VARSIG, ...VARINT[alg]])
  const actual = buf.slice(0, VARINT[alg].length + 1)
  const match = equals(actual, expected)
  if (!match)
    throw new TypeError(
      `Header 0x${hex.encode(actual)} does not match expected 0x${hex.encode(expected)} for ${alg}`
    )
  const enc = varint.decode(buf, expected.length)
  const encoding = CODE_ENCODING[enc[0]]
  if (!encoding) {
    throw new TypeError(`Unsupported encoding 0x${enc[0]}`)
  }

  return encoding
}

/**
 * Decode varsig header
 *
 * @param {Uint8Array} buf
 */
export function decode(buf) {
  const alg = varint.decode(buf, varint.encodingLength(VARSIG))

  switch (CODE_ALG[alg[0]]) {
    case 'RS256': {
      return {
        alg: 'RS256',
        encoding: matchAlg('RS256', buf),
      }
    }

    case 'ES256': {
      return {
        alg: 'ES256',
        encoding: matchAlg('ES256', buf),
      }
    }

    case 'ES384': {
      return {
        alg: 'ES384',
        encoding: matchAlg('ES384', buf),
      }
    }

    case 'ES512': {
      return {
        alg: 'ES512',
        encoding: matchAlg('ES512', buf),
      }
    }

    case 'ES256K': {
      return {
        alg: 'ES256K',
        encoding: matchAlg('ES256K', buf),
      }
    }

    case 'EdDSA': {
      return {
        alg: 'EdDSA',
        encoding: matchAlg('EdDSA', buf),
      }
    }

    default: {
      throw new TypeError(`Unsupported algorithm with code ${alg[0]}`)
    }
  }
}
