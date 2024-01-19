import { base64url } from 'iso-base/rfc4648'
import { sha256 } from 'multiformats/hashes/sha2'
import { code as RAW_CODE } from 'multiformats/codecs/raw'
import { utf8 } from 'iso-base/utf8'
import * as DID from 'iso-did'
import { CID } from 'multiformats/cid'

// eslint-disable-next-line no-unused-vars
import * as T from './types.js'

/**
 * Serialise Object to JWT style string.
 *
 * @param {import('type-fest').Jsonifiable} input - JSON input
 */
export function serialize(input) {
  return base64url.encode(utf8.decode(JSON.stringify(input)))
}

/**
 * Deserialise JWT style string section to object.
 *
 * @template T
 * @param {string} input
 * @returns {T}
 */
export function deserialize(input) {
  let decodedString

  try {
    const decodedBytes = base64url.decode(input)
    decodedString = utf8.encode(decodedBytes)
  } catch {
    throw new Error(`Can't parse: ${input}: Can't parse as base64url.`)
  }

  try {
    return JSON.parse(decodedString)
  } catch {
    throw new Error(
      `Can't parse: ${input}: Can't parse base64url encoded JSON inside.`
    )
  }
}

/**
 *
 * @param {T.UCANProps} data
 * @param {import('iso-signatures/types').ISigner<any>} signer
 * @returns {Promise<T.UCANArtifacts>}
 */
export async function encode(data, signer) {
  /** @type {import('type-fest').Jsonify<T.JWTHeader>} */
  const header = {
    alg: data.issuer.alg,
    typ: 'JWT',
  }
  /** @type {import('type-fest').Jsonify<T.JWTPayload>} */
  const payload = {
    aud: data.audience,
    iss: data.issuer.did,
    cap: data.capabilities,
    exp: data.expiration,
    ucv: data.version,
    fct: data.facts,
    prf: /** @type {T.StringOf<T.CID>[]} */ (
      data.proofs?.map((p) => p.toString())
    ),
    nbf: data.notBefore,
    nnc: data.nonce,
  }

  const headerAndPayload = `${serialize(header)}.${serialize(payload)}`
  const signature = await signer.sign(utf8.decode(headerAndPayload))

  const ucan = /** @type {T.JWT} */ (
    `${headerAndPayload}.${base64url.encode(signature)}`
  )
  const bytes = utf8.decode(ucan)

  return {
    ucan,
    signature,
    bytes,
    cid: CID.create(1, RAW_CODE, await sha256.digest(bytes)),
  }
}

/**
 * Decode JWT style string to Object.
 *
 * TODO: add valiation
 *
 * @param {T.JWT} data
 * @return {Promise<{props: T.UCANProps , artifacts: T.UCANArtifacts}>}
 */
export async function decode(data) {
  const [encodedHeader, encodedPayload, encodedSignature] = data.split('.')
  if (
    encodedHeader === undefined ||
    encodedPayload === undefined ||
    encodedSignature === undefined
  ) {
    throw new Error(
      `Can't parse UCAN: ${data}: Expected JWT format: 3 dot-separated base64url-encoded values.`
    )
  }

  /** @type {T.JWTHeader} */
  const header = deserialize(encodedHeader)
  if (header.typ !== 'JWT') {
    throw new Error(`Expected type "JWT" got ${header.typ}.`)
  }

  /** @type {T.JWTPayload} */
  const payloadObject = deserialize(encodedPayload)
  const issuer = await DID.DID.fromString(payloadObject.iss)

  if (header.alg !== issuer.alg) {
    throw new Error(
      `Expected signature algorithm "${issuer.alg}" got ${header.alg}.`
    )
  }
  const signature = base64url.decode(encodedSignature)
  const bytes = utf8.decode(data)

  return {
    props: {
      audience: DID.parse(payloadObject.aud).did,
      issuer,
      capabilities: payloadObject.cap,
      expiration: payloadObject.exp,
      version: payloadObject.ucv,
      facts: payloadObject.fct,
      proofs: payloadObject.prf?.map((p) => CID.parse(p)),
      notBefore: payloadObject.nbf,
      nonce: payloadObject.nnc,
    },
    artifacts: {
      signature,
      ucan: data,
      bytes,
      cid: CID.create(1, RAW_CODE, await sha256.digest(bytes)),
    },
  }
}
