import { ValidationError } from '../http/errors';
import { parseOrThrow } from './parse';
import { articleListQuerySchema } from './articles/article-list.schema';

describe('parseOrThrow', () => {
  it('returns the parsed, typed value', () => {
    const authorId = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
    expect(parseOrThrow(articleListQuerySchema, { authorId })).toEqual({ authorId });
  });

  it('drops fields the schema does not declare (no mass assignment)', () => {
    const authorId = '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
    expect(parseOrThrow(articleListQuerySchema, { authorId, isAdmin: true })).toEqual({ authorId });
  });

  it('throws a ValidationError with per-field messages', () => {
    expect.assertions(3);
    try {
      parseOrThrow(articleListQuerySchema, { authorId: 'not-a-uuid' });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldErrors).toHaveProperty('authorId');
      expect((error as ValidationError).fieldErrors?.authorId.length).toBeGreaterThan(0);
    }
  });
});
