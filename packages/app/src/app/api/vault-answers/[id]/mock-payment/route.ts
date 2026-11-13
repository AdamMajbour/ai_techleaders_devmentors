import { mockPaymentActionSchema, NotFoundError } from '@devmentor/core';
import { makeActionRoute } from '@devmentor/core/server';
import { isMockPaymentInteractionEnabled } from '@/lib/mock-payment';

const action = makeActionRoute({
  body: mockPaymentActionSchema,
  handler: (id, { outcome }, { cradle, session }) => {
    if (!isMockPaymentInteractionEnabled()) throw new NotFoundError();
    return cradle.vaultAnswerService.completeMockCheckout(session, id, outcome);
  },
});

export const dynamic = 'force-dynamic';
export const { POST } = action;
