import encodeQR from '@paulmillr/qr'

/**
 *
 * @param data - data to encode
 */
export function qr(data: string): string {
  return encodeQR(data, 'svg')
}

/**
 *
 * @param data - data to encode
 * @param output - output format
 */
export function qrpng(data: string, output: string): string {
  return encodeQR(data, 'svg')
}

/**
 *
 * @param a
 * @param b
 * @returns string
 */
export function concat(a: string, b: string): string {
  return a + b
}
