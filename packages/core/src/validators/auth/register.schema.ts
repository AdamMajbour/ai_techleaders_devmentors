import { z } from 'zod';
import { PASSWORD_MAX_LENGTH } from '../../constants';
import { emailSchema } from './email.schema';

/** Short enough to be typed, long enough to resist guessing; the upper bound is bcrypt's 72-byte limit. */
export const PASSWORD_MIN_LENGTH = 12;

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, 'Enter your name').max(100, 'Use at most 100 characters'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`),
});

export type RegisterInput = z.infer<typeof registerSchema>;
