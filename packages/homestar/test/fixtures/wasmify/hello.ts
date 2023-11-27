import { base64 } from 'iso-base/rfc4648'
import { utf8 } from 'iso-base/utf8'

/**
 * Function that sums all the numbers in a list.
 *
 * @param name
 * @param num
 * @returns The sum of all the numbers.
 */
export function sum(name: string, num: number): string {
  return name + num.toString()
}

/**
 *
 * @param name
 */
export function hash(name: string): string {
  return base64.encode(utf8.decode(name))
}

/**
 *
 * @param name
 */
export function hashbytes(name: string): Uint8Array {
  return base64.decode(name)
}
