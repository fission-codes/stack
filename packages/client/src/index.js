import { request } from 'iso-web/http'
import { resolve } from 'iso-web/doh'
import { DID } from 'iso-did'
import * as DIDFission from 'iso-did/fission'
import { UCAN } from '@fission-codes/ucan'
import * as Bearer from '@fission-codes/ucan/bearer'
import * as Schemas from './schemas.js'

// eslint-disable-next-line no-unused-vars
import * as T from './types.js'

export {
  AbortError,
  HttpError,
  JsonError,
  NetworkError,
  RequestError,
  RetryError,
  TimeoutError,
  isRequestError,
} from 'iso-web/http'

const TTL = 15 // 15 seconds

export class Client {
  #baseUrl = ''

  /**
   * @type {T.Session | undefined}
   */
  session = undefined

  /**
   * @param {T.ClientOptions} opts
   */
  constructor(opts) {
    this.#baseUrl = opts.url
    this.did = opts.did
    this.audience = opts.did.didKey
    this.agent = opts.agent
  }

  /**
   *
   * @param {Omit<T.ClientOptions, 'did'>} opts
   * @returns
   */
  static async create(opts) {
    const didString = DIDFission.format(opts.url)
    const did = await DID.fromString(didString, {
      resolvers: {
        ...DIDFission.resolver,
      },
    })
    return new Client({
      ...opts,
      did,
    })
  }

  /**
   * Trigger email verification
   *
   * @see https://github.com/fission-codes/fission-server/blob/main/design/api.md#post-apiv0authemailverify
   *
   * @param {string} email
   * @returns {Promise<T.MaybeResult<T.ResponseSuccess, T.ClientErrors>>}
   */
  async verifyEmail(email) {
    return await request.json.post(
      new URL('/api/v0/auth/email/verify', this.#baseUrl),
      {
        body: {
          email,
        },
      }
    )
  }

  /**
   * @param {T.AccountInput} input
   * @returns {Promise<T.MaybeResult<T.AccountInfo, T.ClientErrors>>}
   */
  async accountCreate(input) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [this.agent.did]: {
          'account/create': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)
    const account =
      await /** @type {typeof request.json.post<import('./types.js').Session>} */ (
        request.json.post
      )(new URL('/api/v0/account', this.#baseUrl), {
        body: input,
        headers,
      })

    if (account.error) {
      return { error: account.error }
    }

    await this.agent.saveProofs(
      await Promise.all(account.result.ucans.map((ucan) => UCAN.fromUcan(ucan)))
    )

    this.session = account.result
    return { result: account.result.account }
  }

  /**
   * @param {T.DID} accountDid
   * @returns {Promise<T.MaybeResult<T.AccountInfo, T.ClientErrors>>}
   */
  async accountInfo(accountDid) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [accountDid]: {
          'account/info': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)
    const account =
      await /** @type {typeof request.json.get<T.AccountInfo>} */ (
        request.json.get
      )(new URL('/api/v0/account', this.#baseUrl), {
        headers,
      })

    return account
  }

  /**
   * @param {T.DID} accountDid
   * @returns {Promise<T.MaybeResult<T.AccountMemberNumber, T.ClientErrors>>}
   */
  async accountMemberNumber(accountDid) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [accountDid]: {
          'account/info': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)
    const account =
      await /** @type {typeof request.json.get<T.AccountMemberNumber>} */ (
        request.json.get
      )(new URL('/api/v0/account/member-number', this.#baseUrl), {
        headers,
      })

    return account
  }

  /**
   *
   * @param {T.LoginInput} input
   */
  async login(input) {
    const parsed = Schemas.LoginInput.safeParse(input)
    if (!parsed.success) {
      return { error: parsed.error }
    }

    const accountDid = await this.resolveHandle(input.username)

    if (accountDid.error) {
      return { error: accountDid.error }
    }

    const link = await this.accountLink(accountDid.result[0], input.code)

    if (link.error) {
      return { error: link.error }
    }

    return { result: link.result }
  }

  async logout() {
    return this.agent.store.clear()
  }

  /**
   * Get a UCAN for a DID that hasn't been associated with this account yet, given an email verification code.
   *
   * @see https://github.com/fission-codes/fission-server/blob/main/design/api.md#post-apiv0accountdidlink
   * @param {T.DID} accountDid
   * @param {string} code
   * @returns {Promise<T.MaybeResult<T.AccountInfo, T.ClientErrors>>}
   */
  async accountLink(accountDid, code) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [this.agent.did]: {
          'account/link': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)
    const account =
      await /** @type {typeof request.json.post<import('./types.js').Session>} */ (
        request.json.post
      )(new URL(`/api/v0/account/${accountDid}/link`, this.#baseUrl), {
        body: {
          code,
        },
        headers,
      })

    if (account.error) {
      return account
    }

    await this.agent.saveProofs(
      await Promise.all(account.result.ucans.map((ucan) => UCAN.fromUcan(ucan)))
    )

    this.session = account.result
    return { result: account.result.account }
  }

  /**
   * Change the account's username. The account DID to change is determined by the resource DID in the authorization UCAN.
   *
   * @see https://github.com/fission-codes/fission-server/blob/main/design/api.md#patch-apiv0accountusernameusername
   * @param {T.DID} accountDid
   * @param {string} username
   * @returns {Promise<T.MaybeResult<T.ResponseSuccess, T.ClientErrors>>}
   */
  async accountManageUsername(accountDid, username) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [accountDid]: {
          'account/manage': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)

    const account =
      await /** @type {typeof request.json.get<T.ResponseSuccess>} */ (
        request.json.patch
      )(new URL(`/api/v0/account/username/${username}`, this.#baseUrl), {
        headers,
      })

    return account
  }

  /**
   * Associate a domain name with an existing account. This will function as the username for the account in the future.
   *
   * @see https://github.com/fission-codes/fission-server/blob/main/design/api.md#patch-apiv0accounthandlehandle
   * @param {T.DID} accountDid
   * @param {string} handle
   * @returns {Promise<T.MaybeResult<T.ResponseSuccess, T.ClientErrors>>}
   */
  async accountManageHandle(accountDid, handle) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [accountDid]: {
          'account/manage': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)

    const account =
      await /** @type {typeof request.json.get<T.ResponseSuccess>} */ (
        request.json.patch
      )(new URL(`/api/v0/account/handle/${handle}`, this.#baseUrl), {
        headers,
      })

    return account
  }

  /**
   * Delete an account.
   *
   * @see https://github.com/fission-codes/fission-server/blob/main/design/api.md#delete-apiv0account
   * @param {T.DID} accountDid
   * @returns {Promise<T.MaybeResult<T.AccountInfo, T.ClientErrors>>}
   */
  async accountDelete(accountDid) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [accountDid]: {
          'account/delete': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)

    const account =
      await /** @type {typeof request.json.get<T.AccountInfo>} */ (
        request.json.delete
      )(new URL(`/api/v0/account`, this.#baseUrl), {
        headers,
      })

    return account
  }

  /**
   * Resolve account DID from account handle
   *
   * @param {string} handle - The account handle <username>.<domain>
   */
  async resolveHandle(handle) {
    /** @type {T.MaybeResult<T.DID[], import('iso-web/doh').Errors>} */
    const out = await resolve(`_did.${handle}`, 'TXT', {
      server: new URL(`/dns-query`, this.#baseUrl).toString(),
    })

    return out
  }

  /**
   * This returns the set of UCANs in UCAN chains that have the authorization UCAN's resource DID as final audience.
   *
   * @see https://github.com/fission-codes/fission-server/blob/main/design/api.md#get-apiv0capabilities
   * @param {T.DID} accountDid
   * @returns {Promise<T.MaybeResult<T.AccountInfo, T.ClientErrors>>}
   */
  async capabilityFetch(accountDid) {
    const { delegation, store } = await this.agent.delegate({
      audience: this.audience,
      ttl: TTL,
      capabilities: {
        [accountDid]: {
          'capability/fetch': [{}],
        },
      },
    })

    const headers = Bearer.encode(delegation, store)

    const account =
      await /** @type {typeof request.json.get<T.AccountInfo>} */ (
        request.json.get
      )(new URL(`/api/v0/capabilities`, this.#baseUrl), {
        headers,
      })

    return account
  }
}
