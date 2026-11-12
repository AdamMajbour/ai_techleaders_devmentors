import { z } from 'zod';
import { makeActionRoute } from '@devmentor/core/server';
import { after } from 'next/server';

export const dynamic = 'force-dynamic';

const action = makeActionRoute({
  body: z.object({}).strict(),
  handler: (id, _body, { cradle, session, background }) => cradle.vaultAnswerService.reconcilePayment(session, id, background),
  background: (task) => after(task),
});

export const { POST } = action;
