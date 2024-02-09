import * as bip39 from '@scure/bip39'
import * as ed from '@noble/ed25519'
import { DIDKey } from 'iso-did/key'
import { wordlist } from '@scure/bip39/wordlists/english'
import { EdDSASigner } from 'iso-signatures/signers/eddsa.js'
import { UCAN } from '../index.js'

export class Bip39Identifier {
  /** @type {string} */
  #seed

  /** @type {import('iso-signatures/types').ISigner<string | CryptoKeyPair>} */
  #signer

  /**
   * @param {import("./types.js").Bip39IdentifierOptions} options
   */
  constructor(options) {
    this.#seed = options.mnemonic
    this.#signer = options.signer
  }

  /**
   * @param {string} [password]
   */
  static async generate(password) {
    const mn = bip39.generateMnemonic(wordlist)
    const pk = bip39.mnemonicToSeedSync(mn, password)
    const privateKey = pk.slice(0, 32)
    const publicKey = await ed.getPublicKeyAsync(privateKey)
    const signer = new EdDSASigner(
      DIDKey.fromPublicKey('Ed25519', publicKey),
      privateKey
    )

    return new Bip39Identifier({
      mnemonic: mn,
      signer,
    })
  }

  /**
   * @param {string} mnemonic
   * @param {string} [password]
   */
  static async import(mnemonic, password) {
    const pk = bip39.mnemonicToSeedSync(mnemonic, password)
    const privateKey = pk.slice(0, 32)
    const publicKey = await ed.getPublicKeyAsync(privateKey)
    const signer = new EdDSASigner(
      DIDKey.fromPublicKey('Ed25519', publicKey),
      privateKey
    )

    return new Bip39Identifier({
      mnemonic,
      signer,
    })
  }

  /**
   * @param {Omit<import('../types.js').UCANOptions, 'issuer'>} options
   */
  async delegate(options) {
    return await UCAN.create({
      ...options,
      issuer: this.#signer,
    })
  }

  export() {
    return this.#seed
  }

  toString() {
    return this.#signer.toString()
  }
}
