import { z } from 'zod';
import { PASSWORD_MAX_LENGTH } from '../../constants';
import { emailSchema } from './email.schema';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`),
});

export type LoginInput = z.infer<typeof loginSchema>;
