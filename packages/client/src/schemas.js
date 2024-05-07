import { z } from 'zod'

/**
 * @typedef {import('zod').z.infer<typeof AccountInput>} AccountInput
 * @typedef {import('zod').z.infer<typeof LoginInput>} LoginInput
 */

export const AccountInput = z.object({
  /**
   * email verification code
   */
  code: z.string().length(6),
  email: z.string(),
  username: z.string(),
  credentialID: z.string().optional(),
})

export const LoginInput = z.object({
  /**
   * email verification code
   */
  code: z.string().length(6),
  username: z.string(),
})
