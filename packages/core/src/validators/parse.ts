import { z } from 'zod';
import { ValidationError } from '../http/errors';

/** Parses untrusted input with a schema; throws a `ValidationError` carrying per-field messages. */
export function parseOrThrow<TSchema extends z.ZodType>(schema: TSchema, input: unknown): z.infer<TSchema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const { fieldErrors } = z.flattenError(result.error);
  throw new ValidationError('The request is invalid.', fieldErrors as Record<string, string[]>);
}
