import { bookingAcceptSchema } from '@devmentor/core';
import { makeActionRoute } from '@devmentor/core/server';

const acceptBooking = makeActionRoute({
  body: bookingAcceptSchema,
  handler: (id, input, { cradle, session }) => cradle.bookingService.accept(session, id, input),
});

export const { POST } = acceptBooking;
