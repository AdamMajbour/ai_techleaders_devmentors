import { ExclusionConstraintViolationError, isExclusionConstraintViolation } from './errors';

describe('PostgreSQL exclusion constraint errors', () => {
  it('recognizes SQLSTATE 23P01 through a wrapped cause', () => {
    expect(isExclusionConstraintViolation({ cause: { code: '23P01' } })).toBe(true);
    expect(isExclusionConstraintViolation({ code: '23505' })).toBe(false);
    expect(isExclusionConstraintViolation(null)).toBe(false);
    expect(new ExclusionConstraintViolationError()).toMatchObject({
      name: 'ExclusionConstraintViolationError',
    });
  });
});
