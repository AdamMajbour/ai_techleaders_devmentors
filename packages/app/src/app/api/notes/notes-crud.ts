import {
  noteInputSchema,
  noteListQuerySchema,
  NotFoundError,
} from '@devmentor/core';
import { makeCrudRoute } from '@devmentor/core/server';

export const notesCrud = makeCrudRoute({
  list: {
    query: noteListQuerySchema,
    requireSession: true,
    handler: (query, { cradle, session }) => {
      if (!session) throw new NotFoundError();
      return cradle.noteService.list(session, query);
    },
  },
  read: {
    requireSession: true,
    handler: (id, { cradle, session }) => {
      if (!session) throw new NotFoundError();
      return cradle.noteService.get(session, id);
    },
  },
  create: {
    body: noteInputSchema,
    handler: (input, { cradle, session }) => cradle.noteService.create(session, input),
  },
  update: {
    body: noteInputSchema,
    handler: (id, input, { cradle, session }) => cradle.noteService.update(session, id, input),
  },
  remove: {
    handler: (id, { cradle, session }) => cradle.noteService.remove(session, id),
  },
});
