import { HTTP_STATUS } from '../constants';
import { AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from './errors';

describe('AppError hierarchy', () => {
  it.each([
    [new ValidationError('bad', { email: ['required'] }), 'validation_failed', HTTP_STATUS.BAD_REQUEST],
    [new UnauthorizedError(), 'unauthorized', HTTP_STATUS.UNAUTHORIZED],
    [new ForbiddenError(), 'forbidden', HTTP_STATUS.FORBIDDEN],
    [new NotFoundError(), 'not_found', HTTP_STATUS.NOT_FOUND],
    [new ConflictError(), 'conflict', HTTP_STATUS.CONFLICT],
  ])('%p carries its code and status', (error, code, status) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
  });

  it('names the error after its class and keeps field errors', () => {
    const error = new ValidationError('bad', { email: ['required'] });
    expect(error.name).toBe('ValidationError');
    expect(error.fieldErrors).toEqual({ email: ['required'] });
  });
});
