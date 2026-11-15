import { notePublishSchema } from '@devmentor/core';
import { makeActionRoute } from '@devmentor/core/server';

const publishNote = makeActionRoute({
  body: notePublishSchema,
  handler: (id, input, { cradle, session }) => cradle.noteService.publish(session, id, input),
});

export const POST = publishNote.POST;
