import * as Client from 'playwright-test/client'
import { base64 } from 'iso-base/rfc4648'
import { Image } from 'canvas'

/**
 *
 * @param {Blob} blob
 */
export async function createImageBitmap(blob) {
  if ('createImageBitmap' in globalThis) {
    return globalThis.createImageBitmap(blob)
  }
  const ab = await blob.arrayBuffer()
  const img = new Image()
  img.src = Buffer.from(ab)

  return img
}

/**
 *
 */
export async function getImgBlob() {
  const resp = await fetch(new URL('/small.png', Client.server))
  if (resp.ok) {
    const blob = await resp.blob()
    const bmp = await createImageBitmap(blob)
    const { width, height } = bmp
    // bmp.close() // free memory
    /** @type {import('../src/types.js').DataURI} */
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
