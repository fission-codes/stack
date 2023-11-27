import fs from 'fs/promises'
import { create } from 'kubo-rpc-client'

/**
 * Add file to IPFS
 *
 * @param {string} path - path to file ie. '/small.png'
 */
export async function addFSFileToIPFS(path) {
  const ipfs = create({
    port: Number(process.env.IPFS_PORT ?? '5001'),
  })

  const file = await ipfs.add(
    {
      content: await fs.readFile(path),
    },
    {
      cidVersion: 1,
    }
  )

  return file.cid
}
