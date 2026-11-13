import { bookingDeclineSchema } from '@devmentor/core';
import { makeActionRoute, requireOperator } from '@devmentor/core/server';

const requestRefund = makeActionRoute({
  body: bookingDeclineSchema,
  handler: (id, _input, { cradle, session }) => {
    requireOperator(session);
    return cradle.bookingService.requestRefund(session, id);
  },
});

export const dynamic = 'force-dynamic';
export const { POST } = requestRefund;
