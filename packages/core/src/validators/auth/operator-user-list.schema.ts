import { z } from 'zod';

export const operatorUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
});

export type OperatorUserListQuery = z.infer<typeof operatorUserListQuerySchema>;
