import { z } from 'zod';
import { makeCrudRoute } from '@devmentor/core/server';
import { vaultAnswerCreateSchema } from '@devmentor/core';
import { after } from 'next/server';

export const dynamic = 'force-dynamic';

const routes = makeCrudRoute({
  list: {
    query: z.object({}).strict(),
    requireSession: true,
    handler: async (_query, { cradle, session, background }) => {
      const result = await cradle.vaultAnswerService.list(session);
      if (background) background(() => cradle.vaultGenerationTask.run({ limit: 5 }).then(() => undefined));
      return result;
    },
    background: (task) => after(task),
  },
  create: {
    body: vaultAnswerCreateSchema,
    handler: (input, { cradle, session, background }) => cradle.vaultAnswerService.createAndSchedule(session, input, background),
    background: (task) => after(task),
  },
});

export const { GET, POST } = routes;
