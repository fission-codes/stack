// eslint-disable-next-line no-unused-vars
import * as T from './types.js'
import { UCAN } from './index.js'

/**
 * Encode UCAN and proofs into HTTP headers.
 *
 * @see https://github.com/ucan-wg/ucan-http-bearer-token
 *
 * @param {T.IUcan} ucan
 * @param {T.IUcanStore} store
 * @returns {T.UCANHTTPHeaders}
 */
export function encode(ucan, store) {
  const ucans = new Set()

  for (const p of ucan.proofs || []) {
    const proof = store.get(p.toString())
    if (proof) {
      ucans.add(proof)
    }
  }

  const headers = {
    authorization: /** @type{T.UCANHTTPHeaders['authorization']} */ (
      `Bearer ${ucan.toString()}`
    ),
  }

  if (ucans.size > 0) {
    return {
      ...headers,
      ucans: [...ucans].join(', '),
    }
  }

  return headers
}

/**
 * Decode HTTP headers into UCAN, proofs and missing CIDs.
 *
 * @see https://github.com/ucan-wg/ucan-http-bearer-token
 *
 * @param {Headers | Record<string, string>} headers
 */
export async function decode(headers) {
  const h = new Headers(headers)
  const authorization = h.get('authorization')

  if (!authorization) {
    throw new Error('Missing authorization header')
  }

  const ucan = await UCAN.fromUcan(
    /** @type {T.JWT} */ (authorization.replace('Bearer ', ''))
  )

  const proofsJwts = /** @type {T.JWT[] | undefined} */ (
    h
      .get('ucans')
      ?.split(',')
      .map((v) => v.trimStart())
  )

  /** @type {Map<string, T.IUcan>} */
  const index = new Map()

  for (const p of proofsJwts || []) {
    const ucan = await UCAN.fromUcan(p)
    index.set(ucan.cid.toString(), ucan)
  }

  return {
    ucan,
    proofs: index,
    missing: ucan.proofs?.filter((p) => !index.has(p.toString())) || [],
  }
}
