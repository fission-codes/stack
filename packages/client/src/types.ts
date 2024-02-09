import type { Agent } from '@fission-codes/ucan/agent'
import type { JWT } from '@fission-codes/ucan/types'
import type { DID, VerifiableDID } from 'iso-did/types'
import type { Errors, JsonError } from 'iso-web/http'

export type * from './schemas.ts'
export type { DID } from 'iso-did/types'
export type { MaybeResult } from 'iso-web/types'
export type { Errors, JsonError } from 'iso-web/http'

export type ClientErrors = Errors | JsonError

export interface ClientOptions {
  url: string
  did: VerifiableDID
  agent: Agent
}

export interface AccountInfo {
  did: DID
  username: string
  email: string
}

export interface Account {
  account: AccountInfo
  ucans: JWT[]
}

export interface AccountMemberNumber {
  memberNumber: number
}

export interface ResponseSuccess {
  success: true
}
