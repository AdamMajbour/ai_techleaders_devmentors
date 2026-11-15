import bcrypt from 'bcryptjs';

/**
 * bcrypt cost. OWASP's floor is 10; 12 costs roughly 250 ms per hash, which is free for a
 * small user base and makes offline guessing about four times slower.
 */
export const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | null = null;

/**
 * Verifies against a throwaway hash. Login calls it when the e-mail is unknown, so an unknown
 * account and a wrong password cost the same time and cannot be told apart by timing.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword('not-a-real-password');
  await verifyPassword(password, await dummyHash);
  return false;
}
