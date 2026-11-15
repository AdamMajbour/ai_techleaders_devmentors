import { ValidationError } from './errors';

/** Reads a JSON request body; a missing or malformed one is a 400, not a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('The request body must be valid JSON.');
  }
}
