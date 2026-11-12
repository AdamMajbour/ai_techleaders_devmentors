import { z } from 'zod';
import { makeActionRoute, requireOperator } from '@devmentor/core/server';
import { NotFoundError } from '@devmentor/core';

const action = makeActionRoute({
  body: z.object({}).strict(),
  handler: async (id, _body, { cradle, session }) => {
    requireOperator(session);
    if (!cradle.vaultSettings().enabled) throw new NotFoundError();
    return cradle.vaultReviewService.cancel(session, id);
  },
});

export const dynamic = 'force-dynamic';
export const { POST } = action;
