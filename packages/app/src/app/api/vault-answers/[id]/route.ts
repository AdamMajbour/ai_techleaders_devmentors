import { makeCrudRoute } from '@devmentor/core/server';
import { after } from 'next/server';

export const dynamic = 'force-dynamic';

const routes = makeCrudRoute({
  read: {
    requireSession: true,
    handler: async (id, { cradle, session, background }) => {
      const result = await cradle.vaultAnswerService.getParticipant(session, id);
      if (background && ['paid', 'generating'].includes(result.status)) background(() => cradle.vaultGenerationTask.run({ limit: 5 }).then(() => undefined));
      return result;
    },
    background: (task) => after(task),
  },
});

export const { GET } = routes;
