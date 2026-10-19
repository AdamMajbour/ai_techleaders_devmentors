import { parseEnv } from './env';

describe('parseEnv', () => {
  it('accepts a long enough JWT secret', () => {
    expect(parseEnv({ JWT_SECRET: 'x'.repeat(32) }).JWT_SECRET).toHaveLength(32);
  });

  it('rejects a missing or short secret and names the variable, never its value', () => {
    expect(() => parseEnv({})).toThrow(/JWT_SECRET/);
    const weak = 'short-secret-value';
    expect(() => parseEnv({ JWT_SECRET: weak })).toThrow(/JWT_SECRET/);
    expect(() => parseEnv({ JWT_SECRET: weak })).not.toThrow(new RegExp(weak));
  });
});
