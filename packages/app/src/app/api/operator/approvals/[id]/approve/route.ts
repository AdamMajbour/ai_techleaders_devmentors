import { refundApprovalActionSchema } from '@devmentor/core';
import { makeActionRoute, requireOperator } from '@devmentor/core/server';

const approveRefund = makeActionRoute({
  body: refundApprovalActionSchema,
  handler: (id, _input, { cradle, session }) => {
    requireOperator(session);
    return cradle.refundService.approve(session, id);
  },
});

export const dynamic = 'force-dynamic';
export const { POST } = approveRefund;
