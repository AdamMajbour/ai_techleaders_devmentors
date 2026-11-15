import { z } from 'zod';

/** Trimmed and lower-cased before it is validated, so ' Ada@Example.com ' is the same account as 'ada@example.com'. */
export const emailSchema = z.string().trim().toLowerCase().max(254, 'Use at most 254 characters').pipe(z.email('Enter a valid e-mail address'));
