/** @jest-environment node */
import { ForbiddenError, type Session } from '@devmentor/core';
import type { Cradle } from '@devmentor/core/server';

const mockRequireSession = jest.fn();
const mockRequireOperator = jest.fn();
const mockListForOperator = jest.fn();
const mockWithScope = jest.fn();

jest.mock('@devmentor/core/server', () => ({
  ...jest.requireActual('@devmentor/core/server'),
  requireSession: (request: Request) => mockRequireSession(request),
  requireOperator: (session: Session) => mockRequireOperator(session),
  withScope: (fn: (cradle: Cradle) => Promise<unknown>) => mockWithScope(fn),
}));

import { GET } from './route';

const session = { userId: 'user-1' } as Session;

beforeEach(() => {
  mockRequireSession.mockReset().mockResolvedValue(session);
  mockRequireOperator.mockReset();
  mockListForOperator.mockReset().mockResolvedValue({ items: [], page: 2, pageSize: 15, total: 16, pageCount: 2 });
  mockWithScope.mockReset().mockImplementation((fn: (cradle: Cradle) => Promise<unknown>) =>
    fn({ userService: { listForOperator: mockListForOperator } } as unknown as Cradle),
  );
});

describe('GET /api/operator/users', () => {
  it('denies users outside the operator allowlist before listing users', async () => {
    mockRequireOperator.mockImplementation(() => { throw new ForbiddenError(); });
    const response = await GET(new Request('http://localhost/api/operator/users'), undefined);

    expect(response.status).toBe(403);
    expect(mockListForOperator).not.toHaveBeenCalled();
  });

  it('passes validated pagination to the operator-only user query', async () => {
    mockRequireOperator.mockImplementation(() => undefined);
    const response = await GET(new Request('http://localhost/api/operator/users?page=2&pageSize=15'), undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { items: [], page: 2, pageSize: 15, total: 16, pageCount: 2 } });
    expect(mockListForOperator).toHaveBeenCalledWith({ page: 2, pageSize: 15 });
  });
});
