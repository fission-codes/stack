# API Design <!-- omit from toc -->

Table of Contents

- [Overview](#overview)
- [@fission/auth](#fissionauth)
  - [API](#api)
  - [Notes](#notes)
  - [Identifier Providers](#identifier-providers)
    - [Types](#types)
  - [Fission Client](#fission-client)
  - [Agent](#agent)
  - [Channels](#channels)
  - [Auth Protocol](#auth-protocol)
- [@fission/data](#fissiondata)
  - [Notes](#notes-1)
- [@fission/compute](#fissioncompute)
- [Ucan Protocol](#ucan-protocol)

## Overview

![Alt text](architecture.excalidraw.svg)

## @fission/auth

### API

```ts
export type AuthResponse<R> =
  | {
      error: undefined
      result: R
    }
  | {
      error: Error
      result: undefined
    }

interface RegisterCredentials {
  username: string
  email: string
  options: {
    emailRedirectUrl?: string
  }
}
interface Credentials {
  username: string
}

interface Account {
  did: string
  username: string
  email: string
}

interface Session {
  agent: Agent
  account: Account
  expiresAt: number
  identifierDelegation: Ucan
  accountDelegation: Ucan
}

interface AuthConfig {
  name?: string // defaults to origin
  debug?: boolean
  identifier: IdentifierProvider
  agent: Agent // Handles signatures, dids, ucans and storage
  client: FissionClient // Handles server requests should be a generic client for a Auth UCAN Protocol
}

declare class Auth {
  constructor(config: AuthConfig)
}

interface IAuth {
  new (config: AuthConfig): Auth
  /**
   * Trigger an email flow to register a user
   * Signs a Register UCAN with an Identifier
   */
  register(credentials: RegisterCredentials): Promise<
    AuthResponse<{
      account: Account
    }>
  >

  /**
   * Used to exchange a code from an email link for a session
   */
  exchangeCodeForSession(code: string): Promise<
    AuthResponse<{
      session: Session
      account: Account
    }>
  >

  /**
   * Requests an Identifier Delegation and IF NEEDED Server Delegations
   *
   * Should we control Session TTL with Identifier Delegation exp and/or Server Delegation exp?
   */
  login(credentials: Credentials): Promise<
    AuthResponse<{
      session: Session
      account: Account
    }>
  >

  /**
   * Delete Identifier and server Delegations
   *
   * Should we delete all agent data as well?
   */
  logout(session: Session): Promise<void>

  /**
   * Subscribe to auth state changes
   */
  onStateChange(
    cb: (
      state: 'Login' | 'Logout' | 'Register' | 'Expired',
      session: null | Session
    ) => void
  ): UnsubscribeFn
}
```

### Notes

- Should keep tabs in sync when in browser
- Revocation api ?

### Identifier Providers

Providers SHOULD:

- Depend only on UCAN (did:key, signer) and optionally on a [channel](#channels). They can have other dependencies but they should be environment specific. They SHOULD NOT depend on an [Agent](#agent).
- Be able to receive a DID and a set of capabilities and return a powerbox style UCAN with those capabilities.
- Be able to send a root delegation over a [channel](#channels) to another device or origin. (see [Delegated](#types))

A powerbox style delegation to an Agent should be treated as a Session.

#### Types

- Local: Only exists on device normally sandboxed to an origin (webcrypto, wallet, metamask snap and local passkeys)
- Synced: Exists on device and is synced with a server (synced passkey)
- Remote: The identifier lives in another device or origin and it needs a [channel](#channels) (websocket, MessageChannel) to request capabilities and receive UCANs. An example could be a personal lobby or a mobile app (wallet).
- Delegated: The identifier has a wildcard delegation from a Remote Identifier Provider. Does NOT have the root keypair just a root delegation. This is useful for Phase 0 device link with QR Code. (same as local but with a wildcard delegation)

### Fission Client

Client SHOULD only handle HTTP logic, it should receive UCAN delegations, set bearer tokens according to [Spec](https://github.com/ucan-wg/ucan-http-bearer-token) and handle HTTP requests.

In the future this SHOULD be a generic UCAN-RPC client that can be used for any UCAN-RPC protocol, given a set of Capabilities.

### Agent

DID, UCAN, Storage and Channels

- Depends on a Identifier Provider, DID resolver, Signer, Storage and Channels
- Should provide persistent storage for UCANs and other data
- Should provide Agent to Agent communication (see [Channels](#channels)), e.g., to sync WNFS keys
- Should be able to delegate UCANs to other Agents.

### Channels

- pairing mechanics (qr-code, deep-link, shared id, etc)
- transport (websocket, MessageChannel)
- encryption (AWAKE MLS)

Comms channel SHOULD a have a generic implementation that can be reused.

### Auth Protocol

Set of UCAN capabilities necessary for Identifier -> Agent -> Server communication

Agent SHOULD only ask Identifier for capabilities it needs NOT wildcard delegation.

## @fission/data

WNFS

### Notes

- Needs to sync keys, we already have device link in auth, we should have a generic and safe comms channel implementation that can be reused or provided by the agent.
-

## @fission/compute

IPVM

## Ucan Protocol
