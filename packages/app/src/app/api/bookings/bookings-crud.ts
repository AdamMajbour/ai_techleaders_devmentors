import {
  bookingCreateSchema,
  bookingListQuerySchema,
  NotFoundError,
} from '@devmentor/core';
import { makeCrudRoute } from '@devmentor/core/server';

export const bookingsCrud = makeCrudRoute({
  list: {
    query: bookingListQuerySchema,
    requireSession: true,
    handler: (query, { cradle, session }) => {
      if (!session) throw new NotFoundError();
      return cradle.bookingService.list(session, query);
    },
  },
  read: {
    requireSession: true,
    handler: (id, { cradle, session }) => {
      if (!session) throw new NotFoundError();
      return cradle.bookingService.getById(session, id);
    },
  },
  create: {
    body: bookingCreateSchema,
    handler: (input, { cradle, session }) => cradle.bookingService.create(session, input),
  },
});
