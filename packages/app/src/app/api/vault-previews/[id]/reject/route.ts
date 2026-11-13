import { z } from 'zod';
import { makeActionRoute } from '@devmentor/core/server';
import { NotFoundError } from '@devmentor/core';

const action = makeActionRoute({
  body: z.object({ reason: z.string().trim().max(500).optional() }).strict(),
  handler: async (id, { reason }, { cradle, session }) => {
    if (!cradle.vaultSettings().enabled || !(await cradle.invitationService.isAcceptedMentor(session.userId))) throw new NotFoundError();
    return cradle.vaultReviewService.decide(session, id, 'reject', reason);
  },
});

export const dynamic = 'force-dynamic';
export const { POST } = action;
