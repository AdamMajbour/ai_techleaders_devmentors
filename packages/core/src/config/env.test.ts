import { parseEnv, parseOperatorUserIds } from './env';

describe('parseEnv', () => {
  it('accepts a long enough JWT secret', () => {
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32) }).JWT_SECRET).toHaveLength(32);
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32) }).OPERATOR_USER_IDS).toEqual([]);
  });

  it('rejects a missing or short secret and names the variable, never its value', () => {
    expect(() => parseEnv({})).toThrow(/JWT_SECRET/);
    const weak = 'short-secret-value';
    expect(() => parseEnv({ JWT_SECRET: weak })).toThrow(/JWT_SECRET/);
    expect(() => parseEnv({ JWT_SECRET: weak })).not.toThrow(new RegExp(weak));
  });

  it('accepts malformed operator configuration without turning it into a startup error', () => {
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32), OPERATOR_USER_IDS: 'not-an-id' }).OPERATOR_USER_IDS).toEqual([]);
    expect(parseOperatorUserIds('not-an-id')).toEqual([]);
  });
});
