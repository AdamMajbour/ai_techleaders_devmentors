import { createLogger, redact } from './logger';

describe('redact', () => {
  it('masks sensitive keys at any depth and leaves the rest', () => {
    const result = redact({
      email: 'a@b.c',
      password: 'hunter2',
      session: { jwtToken: 'x.y.z', list: [{ Authorization: 'Bearer abc', ok: 1 }] },
    });

    expect(result).toEqual({
      email: 'a@b.c',
      password: '[redacted]',
      session: { jwtToken: '[redacted]', list: [{ Authorization: '[redacted]', ok: 1 }] },
    });
  });

  it('masks question and body keys at any depth', () => {
    const result = redact({
      question: 'How do I reset my password?',
      request: { body: 'private message', items: [{ question: 'Another private question' }] },
    });

    expect(result).toEqual({
      question: '[redacted]',
      request: { body: '[redacted]', items: [{ question: '[redacted]' }] },
    });
  });

  it('turns an Error into plain data', () => {
    expect(redact(new Error('boom'))).toMatchObject({ name: 'Error', message: 'boom' });
  });
});

describe('createLogger', () => {
  it('writes one JSON line per call with level, message and masked context', () => {
    const lines: string[] = [];
    createLogger((line) => lines.push(line)).warn('login failed', { email: 'a@b.c', password: 'hunter2' });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ level: 'warn', message: 'login failed', email: 'a@b.c', password: '[redacted]' });
    expect(lines[0]).not.toContain('hunter2');
  });
});
