import fs from 'fs/promises'
import * as Client from 'playwright-test/client'
import { base64 } from 'iso-base/rfc4648'
import { create, urlSource } from 'kubo-rpc-client'

/**
 *
 */
export async function getImgBlob() {
  const resp = await fetch(new URL('/small.png', Client.server))
  if (resp.ok) {
    const blob = await resp.blob()
    const bmp = await createImageBitmap(blob)
    const { width, height } = bmp
    bmp.close() // free memory
    /** @type {import('../src/workflow/types.js').DataURI} */
    const dataUrl = `data:image/png;base64,${base64.encode(
      await blob.arrayBuffer()
    )}`

    return {
      dataUrl,
      width,
      height,
    }
  } else {
    throw new Error('failed to fetch image')
  }
}

/**
 * Add file to IPFS
 *
 * @param {string} path - path to file ie. '/small.png'
 */
export async function addFileToIPFS(path) {
  const ipfs = create({
    port: Number(process.env.IPFS_PORT ?? '5001'),
  })

  const file = await ipfs.add(
    urlSource(new URL(path, Client.server).toString()),
    {
      cidVersion: 1,
    }
  )

  return file.cid
}

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
