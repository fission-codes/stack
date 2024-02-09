import { utf8 } from 'iso-base/utf8'
import { base64 } from 'iso-base/rfc4648'
import * as JWT from './jwt.js'

// eslint-disable-next-line no-unused-vars
import * as T from './types.js'

/** @type {T.Version} */
export const VERSION = '0.10.0'

/**
 * Returns UTC Unix timestamp for comparing it against time window of the UCAN.
 */
export const now = () => Math.floor(Date.now() / 1000)

/**
 * @implements {T.IUcan}
 */
export class UCAN {
  /**
   * @param {Omit<T.UCANProps, 'version'>} props
   * @param {T.UCANArtifacts} artifacts
   */
  constructor(props, artifacts) {
    this.issuer = props.issuer
    this.audience = props.audience
    this.version = VERSION
    this.capabilities = props.capabilities
    this.expiration = props.expiration
    this.notBefore = props.notBefore
    this.nonce = props.nonce
    this.facts = props.facts
    this.proofs = props.proofs

    this.signature = artifacts.signature
    this.bytes = artifacts.bytes
    this.ucan = artifacts.ucan
    this.cid = artifacts.cid
  }

  /**
   *
   * @param {T.UCANOptions} opts
   */
  static async create(opts) {
    const {
      issuer,
      audience,
      capabilities,
      expiration,
      notBefore,
      nonce,
      facts,
      proofs,
      ttl,
    } = opts

    /** @type {T.UCANProps} */
    const props = {
      issuer,
      audience,
      capabilities,
      // eslint-disable-next-line unicorn/no-null
      expiration: expiration ?? (typeof ttl === 'number' ? now() + ttl : null),
      notBefore,
      nonce,
      facts,
      proofs,
      version: VERSION,
    }
    const ucan = new UCAN(props, await JWT.encode(props, issuer))
    return ucan
  }

  /**
   *
   * @param {import('./types.js').JWT} ucan - JWT string
   */
  static async fromUcan(ucan) {
    const { props, artifacts } = await JWT.decode(ucan)
    return new UCAN(props, artifacts)
  }

  /**
   *
   * @returns {import('multiformats').Block<Uint8Array, T.CodecCode, T.HashCode, 1>}
   */
  block() {
    return {
      bytes: this.bytes,
      cid: this.cid,
    }
  }

  /**
   *
   * @param {import('iso-signatures/types').IResolver} resolver
   */
  async isValid(resolver) {
    const [encodedHeader, encodedPayload] = this.ucan.split('.')
    const isVerified = await resolver.verify({
      message: utf8.decode(`${encodedHeader}.${encodedPayload}`),
      signature: this.signature,
      ...this.issuer,
    })

    if (!isVerified) {
      return false
    }

    if (this.expiration && this.expiration <= now()) {
      return false
    }

    if (this.notBefore && this.notBefore > now()) {
      return false
    }

    return true
  }

  /**
   *
   * @returns {T.JWT}
   */
  toString() {
    return this.ucan
  }

  /**
   *
   * @returns {T.Jsonifiable}
   */
  toJSON() {
    return {
      issuer: this.issuer.toString(),
      audience: this.audience.toString(),
      version: this.version,
      capabilities: /** @type {T.Jsonify<T.Capabilities>} **/ (
        this.capabilities
      ),
      expiration: this.expiration,
      notBefore: this.notBefore,
      nonce: this.nonce,
      facts: /** @type {T.Jsonify<T.Facts>} **/ (this.facts),
      proofs: /** @type {T.Jsonify<import('multiformats').LinkJSON[]>} **/ (
        this.proofs?.map((p) => p.toJSON())
      ),
      signature: base64.encode(this.signature),
      ucan: this.ucan,
      bytes: utf8.encode(this.bytes),
      cid: /** @type {T.Jsonify<import('multiformats').LinkJSON>} **/ (
        this.cid.toJSON()
      ),
    }
  }
}
