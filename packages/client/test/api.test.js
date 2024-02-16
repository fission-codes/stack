import { assert, suite } from 'playwright-test/taps'
import { WS } from 'iso-websocket'
import { EdDSASigner } from 'iso-signatures/signers/eddsa.js'
import pdefer from 'p-defer'
import { Agent } from '@fission-codes/ucan/agent'
import { Client, JsonError } from '../src/index.js'

// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as T from '../src/types.js'

const test = suite('client')
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000'
const resolveSigner = (
  /** @type {string | CryptoKeyPair | undefined} */ exported
) => {
  if (typeof exported === 'string') {
    return EdDSASigner.import(exported)
  }

  return EdDSASigner.generate()
}

/**
 * @param {string} email
 */
function waitForCode(email) {
  /** @type {import('p-defer').DeferredPromise<string>} */
  const d = pdefer()
  const isReady = pdefer()
  const ws = new WS(`${SERVER_URL}/api/v0/relay/${email}`)
  ws.addEventListener('message', (e) => {
    d.resolve(e.data)
    ws.close()
  })
  ws.addEventListener('open', () => {
    isReady.resolve()
  })

  return { isReady: isReady.promise, codePromise: d.promise }
}

/**
 * Create an account
 */
async function createAccount() {
  const username = `usernametest-${Date.now()}`
  const email = `${username}@gmail.com`
  const { codePromise, isReady } = waitForCode(email)

  const agent = await Agent.create({
    resolveSigner,
  })

  const client = await Client.create({
    url: SERVER_URL,
    agent,
  })

  await isReady
  const out = await client.verifyEmail(email)
  assert.ok(out.result?.success)
  const code = await codePromise

  const createAccount = await client.accountCreate({
    code,
    email,
    username,
  })
  if (createAccount.error) {
    return assert.fail(createAccount.error)
  }

  return {
    client,
    account: createAccount.result,
    email,
    agent,
  }
}

test('should verify email', async function () {
  const email = 'test@mail.com'
  const { codePromise, isReady } = waitForCode(email)
  const agent = await Agent.create({
    resolveSigner,
  })
  const client = await Client.create({
    url: SERVER_URL,
    agent,
  })

  await isReady
  const out = await client.verifyEmail(email)

  assert.ok(out.result?.success)

  const code = await codePromise
  assert.ok(code)
  assert.equal(code.length, 6)
})

test('should create account', async function () {
  const username = `usernametest-${Date.now()}`
  const email = `${username}@gmail.com`
  const { codePromise, isReady } = waitForCode(email)

  const agent = await Agent.create({
    resolveSigner,
  })

  const client = await Client.create({
    url: SERVER_URL,
    agent,
  })

  await isReady
  const out = await client.verifyEmail(email)
  assert.ok(out.result?.success)
  const code = await codePromise

  const { error, result } = await client.accountCreate({
    code,
    email,
    username,
  })

  if (error) {
    assert.fail(error)
  }

  assert.deepEqual(result?.username, username + '.localhost')
  assert.deepEqual(result?.email, email)
})

test('should get account info', async function () {
  const { account, client } = await createAccount()

  const accountInfo = await client.accountInfo(account.did)

  if (accountInfo.error) {
    assert.fail(accountInfo.error)
  }
  assert.deepEqual(account, accountInfo.result)
})

test('should get account member number', async function () {
  const { account, client } = await createAccount()

  const memberNumber = await client.accountMemberNumber(account.did)

  if (memberNumber.error) {
    assert.fail(memberNumber.error)
  }
  assert.ok(typeof memberNumber.result.memberNumber === 'number')
})

test('should link new agent to account using email code', async function () {
  const { account, email } = await createAccount()
  const { codePromise, isReady } = waitForCode(email)
  const agent = await Agent.create({
    resolveSigner,
  })

  const client = await Client.create({
    url: SERVER_URL,
    agent,
  })

  await isReady
  await client.verifyEmail(email)
  const code = await codePromise
  await client.accountLink(account.did, code)
  const accountInfo = await client.accountInfo(account.did)

  assert.deepEqual(account, accountInfo.result)
})

test('should change username', async function () {
  const { account, client } = await createAccount()
  const changedUsername = `changedusername-${Date.now()}`
  await client.accountManageUsername(account.did, changedUsername)

  const accountInfo = await client.accountInfo(account.did)

  assert.deepEqual(accountInfo.result?.username, `${changedUsername}.localhost`)
})

test('should fail changing username with conflict', async function () {
  const account1 = await createAccount()
  const account2 = await createAccount()

  const changeUsername = await account1.client.accountManageUsername(
    account1.account.did,
    account2.account.username.split('.')[0]
  )

  if (changeUsername.result) {
    assert.fail('Should have failed to change username')
  }

  // @ts-ignore
  assert.equal(changeUsername.error?.cause?.errors[0].status, '409')
})

test('should fail changing handle without txt record', async function () {
  const { account, client } = await createAccount()
  const changeHandle = await client.accountManageHandle(
    account.did,
    'hugomrdias.dev'
  )

  if (changeHandle.error) {
    assert.ok(JsonError.is(changeHandle.error))
    assert.deepEqual(changeHandle.error.cause, {
      errors: [
        {
          detail: `Couldn't find DNS TXT record for _did.hugomrdias.dev set to ${account.did}`,
          status: '403',
          title: 'Forbidden',
        },
      ],
    })
  } else {
    assert.fail('Should have failed to change handle')
  }
})

test('should delete account', async function () {
  const { account, client } = await createAccount()
  const deleteAccount = await client.accountDelete(account.did)

  if (deleteAccount.error) {
    assert.fail(deleteAccount.error)
  }

  assert.deepEqual(deleteAccount.result, account)

  const accountInfo = await client.accountInfo(account.did)
  assert.ok(accountInfo.error)
})

test('should resolve handle to account did', async function () {
  const { account, client } = await createAccount()
  const doh = await client.resolveHandle(account.username)

  if (doh.error) {
    assert.fail(doh.error)
  }

  assert.equal(doh.result[0], account.did)
})

test.skip('should fetch capabilities', async function () {
  const { account, agent } = await createAccount()
  // console.log('🚀 ~ account:', account, agent.did)

  // const pk = agent.signer.export()

  const agent2 = await Agent.create({
    resolveSigner,
  })
  const powerbox = await agent.delegate({
    audience: agent2.did,
    capabilities: {
      'ucan:*': { '*': [{}] },
    },
  })

  agent2.saveProofs([powerbox.delegation, ...powerbox.store.values()])
  // console.log('🚀 ~ agent2:', agent2.did)

  const client2 = await Client.create({
    url: SERVER_URL,
    agent: agent2,
  })
  const caps = await client2.capabilityFetch(account.did)
  if (caps.error) {
    assert.fail(caps.error)
  }
  // console.log('🚀 ~ caps:', caps.error?.cause)
})
