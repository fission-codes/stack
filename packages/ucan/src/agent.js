import { KV } from 'iso-kv'
import { MemoryDriver } from 'iso-kv/drivers/memory.js'
import { UCAN } from './index.js'

const SIGNER_KEY = 'signer'
const PROOFS_KEY = 'proofs'

export class Agent {
  /**
   *
   * @param {import("./types.js").AgentOptions} options
   */
  constructor(options) {
    this.store = options.store
    this.signer = options.signer
    this.did = this.signer.did
  }

  /**
   *
   * @param {import('./types.js').AgentCreateOptions} options
   */
  static async create(options) {
    const kv = new KV({
      driver: options.driver ?? new MemoryDriver(),
    })

    let signer

    try {
      signer = await options.resolveSigner(await kv.get([SIGNER_KEY]))
    } catch (error) {
      throw new TypeError('Signer resolver mismatch.', { cause: error })
    }

    await kv.set(['signer'], signer.export())

    return new Agent({
      store: kv,
      signer,
    })
  }

  /**
   * @param {Omit<import('./types.js').UCANOptions, 'issuer'| 'proofs'>} options
   */
  async delegate(options) {
    /**
     * @type {import('./types.js').IUcanStore}
     */
    const store = new Map()

    for await (const {
      value,
    } of /** @type {typeof this.store.list<import('./types.js').JWT>} */ (
      this.store.list
    )({
      prefix: [PROOFS_KEY],
    })) {
      const proof = await UCAN.fromUcan(value)
      store.set(proof.cid.toString(), proof)
    }

    const delegation = await UCAN.create({
      ...options,
      issuer: this.signer,
      proofs: [...store.values()].map((proof) => proof.cid),
    })

    return { delegation, store }
  }

  /**
   *
   * @param {import('./types.js').IUcan[]} proofs
   */
  async saveProofs(proofs) {
    for (const proof of proofs) {
      // if (proof.audience === this.signer.did) {
      //   console.log('its for me', proof.capabilities)
      // }
      await this.store.set(
        [PROOFS_KEY, proof.cid.toString()],
        proof.toString(),
        {
          expiration: proof.expiration,
        }
      )
    }
  }
}
