/** @jest-environment node */
import { BCRYPT_COST, hashPassword, verifyAgainstDummy, verifyPassword } from './password';

describe('password hashing', () => {
  it('uses bcrypt with a cost factor of at least 12', async () => {
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
    expect(await hashPassword('correct horse battery')).toMatch(/^\$2[aby]\$12\$/);
  }, 20_000);

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery');

    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong horse battery', hash)).toBe(false);
  }, 20_000);

  it('salts: the same password never hashes to the same string', async () => {
    expect(await hashPassword('same password!')).not.toBe(await hashPassword('same password!'));
  }, 20_000);

  it('verifyAgainstDummy always answers false (but spends the time of a real check)', async () => {
    expect(await verifyAgainstDummy('anything')).toBe(false);
  }, 20_000);
});
