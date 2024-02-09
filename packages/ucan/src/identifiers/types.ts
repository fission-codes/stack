import type { ISigner } from 'iso-signatures/types'

// export interface Identifier {}

export interface Bip39IdentifierOptions {
  mnemonic: string
  signer: ISigner<string | CryptoKeyPair>
}
