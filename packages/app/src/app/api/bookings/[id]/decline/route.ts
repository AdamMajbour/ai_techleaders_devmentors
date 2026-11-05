import { bookingDeclineSchema } from '@devmentor/core';
import { makeActionRoute } from '@devmentor/core/server';

const declineBooking = makeActionRoute({
  body: bookingDeclineSchema,
  handler: (id, _input, { cradle, session }) => cradle.bookingService.decline(session, id),
});

export const { POST } = declineBooking;
