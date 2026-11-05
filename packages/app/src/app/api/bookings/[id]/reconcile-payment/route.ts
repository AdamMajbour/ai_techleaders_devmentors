import { bookingReconcilePaymentSchema } from '@devmentor/core';
import { createRateLimiter, makeActionRoute } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

const reconcileLimiter = createRateLimiter({
  maxAttempts: 30,
  windowMs: 60_000,
  cooldownMs: 60_000,
});

const reconcilePayment = makeActionRoute({
  body: bookingReconcilePaymentSchema,
  handler: (id, _body, { cradle, session }) => {
    const key = `${session.userId}:${id}`;
    reconcileLimiter.assertAllowed(key);
    reconcileLimiter.recordFailure(key);
    return cradle.bookingService.reconcilePayment(session, id);
  },
});

/** POST /api/bookings/[id]/reconcile-payment is restricted to that booking's seeker. */
export const { POST } = reconcilePayment;
