import { z } from 'zod';

export const articleListQuerySchema = z.object({
  authorId: z.uuid(),
});

export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;
