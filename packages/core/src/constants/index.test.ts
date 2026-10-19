import { HTTP_STATUS } from './index';

describe('HTTP_STATUS', () => {
  it('exposes standard status codes', () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
  });
});
