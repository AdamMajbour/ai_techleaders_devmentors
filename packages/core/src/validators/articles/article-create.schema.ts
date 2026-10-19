import { z } from 'zod';

// No `authorId`: the author is always the logged-in user (a client must not choose it).
export const articleCreateSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(200, 'Use at most 200 characters'),
  content: z.string().trim().min(1, 'Write some content').max(20_000, 'Use at most 20 000 characters'),
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
