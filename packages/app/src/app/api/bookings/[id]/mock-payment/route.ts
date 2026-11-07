import { mockPaymentActionSchema, NotFoundError } from '@devmentor/core';
import { makeActionRoute } from '@devmentor/core/server';
import { isMockPaymentInteractionEnabled } from '@/lib/mock-payment';

export const dynamic = 'force-dynamic';

const mockPayment = makeActionRoute({
  body: mockPaymentActionSchema,
  handler: (id, { outcome }, { cradle, session }) => {
    if (!isMockPaymentInteractionEnabled()) throw new NotFoundError();
    return cradle.bookingService.completeMockCheckout(session, id, outcome);
  },
});

/** Test/development-only mock checkout completion; no mock payment bypass is enabled in production. */
export const { POST } = mockPayment;
