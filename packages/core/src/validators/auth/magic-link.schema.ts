import { z } from 'zod';
import { emailSchema } from './email.schema';

export const magicLinkRequestSchema = z.object({ email: emailSchema });

// Token syntax is checked by MagicLinkService so every malformed token is answered with 401.
export const magicLinkConsumeSchema = z.object({ token: z.string() });

export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkConsumeInput = z.infer<typeof magicLinkConsumeSchema>;
