import { log } from '@fission-codes/homestar-wit/logging'

/**
 *
 * @param a
 * @param b
 */
export function subtract(a: number, b: number): number {
  const result = a - b

  log('info', 'HELLO WORLD', `${a} - ${b} = ${result}`)

  return result
}

/**
 *
 */
export function buf(): Uint8Array {
  return new Uint8Array(2)
}
