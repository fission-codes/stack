import type { DID, SignatureAlgorithm, VerifiableDID } from 'iso-did/types'
import type { CID } from 'multiformats/cid'
import type { Jsonifiable, Jsonify, Opaque } from 'type-fest'
import type { IResolver, ISigner } from 'iso-signatures/types'
import type { code as RAW_CODE } from 'multiformats/codecs/raw'
import type { sha256 } from 'multiformats/hashes/sha2'
import type { Block } from 'multiformats'
import type { Driver, IKV } from 'iso-kv'
import type { ENCODING } from './varsig'

export { CID } from 'multiformats/cid'

export type { Jsonify, Jsonifiable } from 'type-fest'

export type CodecCode = typeof RAW_CODE
export type HashCode = typeof sha256.code

export type StringOf<T> = Opaque<string, T>

/**
 * The expiration time is specified as a Unix timestamp in seconds since UNIX epoch
 */
export type UnixTimestamp = number

export type Nonce = string

/**
 * Verifiable facts and proofs of knowledge included in a UCAN {@link JWTPayload} in order to
 * support claimed capabilities.
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#325-facts
 */
export type Facts = Record<string, unknown>

/**
 * The version of the UCAN spec used to produce a specific UCAN.
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#321-version
 */
export type Version = `${number}.${number}.${number}`

/**
 * A UCAN, encoded as a JSON Web Token (JWT) string.
 */
export type JWT = `${string}.${string}.${string}`

/**
 * A UCAN header, in the format used by the JWT encoding.
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#31-header
 */
export interface JWTHeader {
  alg: SignatureAlgorithm
  typ: 'JWT'
}

/**
 * A UCAN payload, in the format used by the JWT encoding.
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#32-payload
 */
export interface JWTPayload<C extends Capabilities = Capabilities> {
  ucv: Version
  iss: string
  aud: string
  nbf?: UnixTimestamp
  exp: UnixTimestamp | null
  nnc?: Nonce
  fct?: Facts
  cap: C
  prf?: Array<StringOf<CID>>
}

/**
 * A list of caveats that must be satisfied in order for a UCAN to be valid.
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#3263-caveat-array
 */
export type Caveat = Record<string, unknown>
export type Caveats = Caveat[]

/**
 * A string that represents some action that a UCAN holder can do.
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#3262-abilities
 */
export type Ability = `${string}/${string}` | `ucan/*` | '*'

/**
 * A string that represents resource a UCAN holder can act upon.
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#3261-resource
 */
export type Resource =
  | `${string}:${string}`
  | `ucan:${string}`
  | `ucan:*`
  | `ucan:./*`
  | `ucan://${string}/*`
  | `ucan://${string}/${string}`

/**
 *
 * @todo TS can't handle Ability type as a key in a Record forces the '*' key to exist in the Record
 *
 * @see https://github.com/ucan-wg/spec?tab=readme-ov-file#3262-abilities
 */
export type Abilities =
  | {
      [key in `${string}/${string}`]: Caveats
    }
  | {
      [key in `*`]: Caveats
    }

export type Capabilities = Record<Resource, Abilities>

export interface UCANOptions<C extends Capabilities = Capabilities> {
  issuer: ISigner<any>
  audience: DID
  capabilities: C
  facts?: Facts
  notBefore?: UnixTimestamp
  expiration?: UnixTimestamp
  nonce?: Nonce
  proofs?: CID[]
  /**
   * Time to live in seconds
   */
  ttl?: number
}

/**
 * UCAN representation as a JS object.
 */
export interface UCANProps<C extends Capabilities = Capabilities> {
  readonly issuer: VerifiableDID
  readonly audience: DID
  readonly version: Version
  readonly capabilities: C
  readonly expiration: UnixTimestamp | null
  readonly notBefore?: UnixTimestamp
  readonly nonce?: Nonce
  readonly facts?: Facts
  readonly proofs?: CID[]
}

export interface UCANArtifacts {
  /**
   * UCAN Issuer signature of the UCAN payload
   */
  readonly signature: Uint8Array
  /**
   * UCAN encoded as a JWT
   */
  readonly ucan: JWT
  /**
   * Multiformat Raw Codec encoded bytes
   */
  readonly bytes: Uint8Array
  /**
   * CID v1
   */
  readonly cid: CID<Uint8Array, CodecCode, HashCode, 1>
}

/**
 * Represents a decoded "view" of a UCAN as a JS object that can be used in your domain logic, etc.
 */
export interface IUcan<C extends Capabilities = Capabilities>
  extends UCANProps<C>,
    UCANArtifacts {
  block: () => Block<Uint8Array, CodecCode, HashCode, 1>
  isValid: (resolver: IResolver) => Promise<boolean>
  toString: () => JWT
  toJSON: () => Jsonifiable
}

/**
 * UCAN as Bearer Token
 */

/**
 * HTTP Request headers for UCAN bearer token
 *
 * @see https://github.com/ucan-wg/ucan-http-bearer-token?tab=readme-ov-file#2-request-headers
 */
export type UCANHTTPHeaders = Jsonify<{
  authorization: `Bearer ${JWT}`
  ucans?: string
}>

export type IUcanStore = Map<string, IUcan>

export interface AgentOptions {
  // identifier: Bip39Identifier
  store: IKV
  signer: ISigner<string | CryptoKeyPair>
}

export interface AgentCreateOptions {
  driver?: Driver
  resolveSigner: (
    exported: string | CryptoKeyPair | undefined
  ) => Promise<ISigner<string | CryptoKeyPair>>
}

/**
 * Varsig types
 */

export interface VarsigOptions {
  encoding: keyof typeof ENCODING
  alg: SignatureAlgorithm
}
