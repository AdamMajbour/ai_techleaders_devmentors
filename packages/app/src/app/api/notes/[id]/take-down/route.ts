import { noteTakeDownSchema } from '@devmentor/core';
import { makeActionRoute } from '@devmentor/core/server';

const takeDownNote = makeActionRoute({
  body: noteTakeDownSchema,
  handler: (id, _input, { cradle, session }) => cradle.noteService.takeDown(session, id),
});

export const POST = takeDownNote.POST;
