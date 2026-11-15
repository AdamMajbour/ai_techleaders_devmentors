import { articleCreateSchema } from './articles/article-create.schema';
import { articleUpdateSchema } from './articles/article-update.schema';
import { loginSchema } from './auth/login.schema';
import { registerSchema } from './auth/register.schema';
import { idSchema } from './id.schema';

describe('registerSchema', () => {
  const valid = { email: '  Ada@Example.COM ', name: ' Ada ', password: 'correct horse battery' };

  it('normalizes the e-mail and trims the name', () => {
    expect(registerSchema.parse(valid)).toEqual({ email: 'ada@example.com', name: 'Ada', password: 'correct horse battery' });
  });

  it('enforces the password bounds (12 to bcrypt\'s 72)', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'x'.repeat(11) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: 'x'.repeat(12) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, password: 'x'.repeat(72) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, password: 'x'.repeat(73) }).success).toBe(false);
  });

  it('rejects a malformed e-mail and an empty name', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('drops undeclared fields such as a role or id', () => {
    expect(registerSchema.parse({ ...valid, id: 'x', role: 'admin' })).not.toHaveProperty('role');
  });
});

describe('loginSchema', () => {
  it('normalizes the e-mail and bounds the password', () => {
    expect(loginSchema.parse({ email: 'A@B.CO', password: 'p' })).toEqual({ email: 'a@b.co', password: 'p' });
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(73) }).success).toBe(false);
  });
});

describe('article schemas', () => {
  it('create: trims, requires both fields, and has no author field', () => {
    expect(articleCreateSchema.parse({ title: ' T ', content: ' C ', authorId: 'x' })).toEqual({ title: 'T', content: 'C' });
    expect(articleCreateSchema.safeParse({ title: 'T' }).success).toBe(false);
    expect(articleCreateSchema.safeParse({ title: 'x'.repeat(201), content: 'C' }).success).toBe(false);
  });

  it('update: needs at least one of title or content', () => {
    expect(articleUpdateSchema.parse({ title: 'New' })).toEqual({ title: 'New' });
    expect(articleUpdateSchema.safeParse({}).success).toBe(false);
    expect(articleUpdateSchema.safeParse({ authorId: 'x' }).success).toBe(false);
  });
});

describe('idSchema', () => {
  it('accepts only UUIDs (IDs are never sequential numbers)', () => {
    expect(idSchema.safeParse('0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11').success).toBe(true);
    expect(idSchema.safeParse('42').success).toBe(false);
  });
});
