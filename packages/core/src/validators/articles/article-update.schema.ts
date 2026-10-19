import { z } from 'zod';
import { articleCreateSchema } from './article-create.schema';

export const articleUpdateSchema = articleCreateSchema
  .partial()
  .refine((input) => input.title !== undefined || input.content !== undefined, {
    message: 'Provide a title or content to update.',
  });

export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
