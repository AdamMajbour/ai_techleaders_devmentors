/** @jest-environment node */
import type { Cradle } from '@devmentor/core/server';
import { resetEnvCache } from '../../../../../../core/src/config/env';
import { SESSION_COOKIE, signSession } from '../../../../../../core/src/security/session';

const mockRefundService = {
  listOperatorApprovals: jest.fn(async () => ({ items: [] })),
  approve: jest.fn(async () => ({ id: '00000000-0000-4000-8000-000000000101', status: 'refunded' })),
  reject: jest.fn(async () => ({ id: '00000000-0000-4000-8000-000000000101', status: 'rejected' })),
};
const mockCradle = { refundService: mockRefundService } as unknown as Cradle;
const mockWithScope = jest.fn(async (fn: (cradle: Cradle) => Promise<unknown>) => fn(mockCradle));

jest.mock('../../../../../../core/src/container/container', () => ({
  ...jest.requireActual('../../../../../../core/src/container/container'),
  withScope: (fn: (cradle: Cradle) => Promise<unknown>) => mockWithScope(fn),
}));

import { GET as listApprovals } from './route';
import { POST as approveRefund } from './[id]/approve/route';
import { POST as rejectRefund } from './[id]/reject/route';

const SECRET = 'r'.repeat(48);
const OPERATOR_ID = '00000000-0000-4000-8000-000000000104';
const OTHER_ID = '00000000-0000-4000-8000-000000000105';
const APPROVAL_ID = '00000000-0000-4000-8000-000000000101';
const context = { params: Promise.resolve({ id: APPROVAL_ID }) };
const emptyContext = { params: Promise.resolve({}) };

async function headersFor(userId: string, extra: Record<string, string> = {}) {
  return {
    cookie: `${SESSION_COOKIE}=${await signSession(userId, SECRET)}`,
    ...extra,
  };
}

function mutationHeaders(extra: Record<string, string> = {}) {
  return {
    'x-requested-with': 'devmentor',
    origin: 'http://localhost',
    host: 'localhost',
    'content-type': 'application/json',
    ...extra,
  };
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.OPERATOR_USER_IDS = OPERATOR_ID;
  resetEnvCache();
  for (const method of Object.values(mockRefundService)) method.mockClear();
  mockWithScope.mockClear().mockImplementation(async (fn) => fn(mockCradle));
});

describe('/api/operator/approvals', () => {
  it('requires an authenticated configured operator to list approvals', async () => {
    expect((await listApprovals(new Request('http://localhost/api/operator/approvals'), emptyContext)).status).toBe(401);
    const forbidden = await listApprovals(new Request('http://localhost/api/operator/approvals', {
      headers: await headersFor(OTHER_ID),
    }), emptyContext);
    expect(forbidden.status).toBe(403);
    expect(mockRefundService.listOperatorApprovals).not.toHaveBeenCalled();

    const allowed = await listApprovals(new Request('http://localhost/api/operator/approvals', {
      headers: await headersFor(OPERATOR_ID),
    }), emptyContext);
    expect(allowed.status).toBe(200);
    expect(mockRefundService.listOperatorApprovals).toHaveBeenCalledWith({ userId: OPERATOR_ID });
  });

  it('guards approve and reject mutations with operator session and CSRF checks', async () => {
    const denied = await approveRefund(new Request(`http://localhost/api/operator/approvals/${APPROVAL_ID}/approve`, {
      method: 'POST',
      headers: mutationHeaders(await headersFor(OTHER_ID)),
      body: '{}',
    }), context);
    expect(denied.status).toBe(403);
    expect(mockRefundService.approve).not.toHaveBeenCalled();

    const approved = await approveRefund(new Request(`http://localhost/api/operator/approvals/${APPROVAL_ID}/approve`, {
      method: 'POST',
      headers: mutationHeaders(await headersFor(OPERATOR_ID)),
      body: '{}',
    }), context);
    const rejected = await rejectRefund(new Request(`http://localhost/api/operator/approvals/${APPROVAL_ID}/reject`, {
      method: 'POST',
      headers: mutationHeaders(await headersFor(OPERATOR_ID)),
      body: '{}',
    }), context);

    expect(approved.status).toBe(200);
    expect(rejected.status).toBe(200);
    expect(mockRefundService.approve).toHaveBeenCalledWith({ userId: OPERATOR_ID }, APPROVAL_ID);
    expect(mockRefundService.reject).toHaveBeenCalledWith({ userId: OPERATOR_ID }, APPROVAL_ID);
  });
});
