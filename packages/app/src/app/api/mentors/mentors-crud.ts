import {
  mentorListQuerySchema,
  mentorProfileInputSchema,
  mentorProfileUpdateSchema,
  NotFoundError,
} from '@devmentor/core';
import { makeCrudRoute } from '@devmentor/core/server';

export const mentorsCrud = makeCrudRoute({
  list: {
    query: mentorListQuerySchema,
    requireSession: true,
    handler: (query, { cradle, session }) => {
      if (!session) throw new NotFoundError();
      if (query.slug) return cradle.mentorService.getBySlug(session, query.slug);
      return cradle.mentorService.list(session, query);
    },
  },
  read: {
    requireSession: true,
    handler: (id, { cradle, session }) => {
      if (!session) throw new NotFoundError();
      return cradle.mentorService.getById(session, id);
    },
  },
  create: {
    body: mentorProfileInputSchema,
    handler: (input, { cradle, session }) => cradle.mentorService.create(session, input),
  },
  update: {
    body: mentorProfileUpdateSchema,
    handler: (id, changes, { cradle, session }) => cradle.mentorService.update(session, id, changes),
  },
});
