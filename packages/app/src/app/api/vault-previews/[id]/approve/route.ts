import { z } from 'zod';
import { makeActionRoute } from '@devmentor/core/server';
import { NotFoundError } from '@devmentor/core';

const action = makeActionRoute({
  body: z.object({}).strict(),
  handler: async (id, _body, { cradle, session }) => {
    if (!cradle.vaultSettings().enabled || !(await cradle.invitationService.isAcceptedMentor(session.userId))) throw new NotFoundError();
    return cradle.vaultReviewService.decide(session, id, 'approve');
  },
});

export const dynamic = 'force-dynamic';
export const { POST } = action;
