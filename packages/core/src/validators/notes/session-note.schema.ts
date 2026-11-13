import { z } from 'zod';

export const sessionNoteCreateSchema = z.object({
  sessionId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(20000),
});
export const sessionNoteUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  content: z.string().trim().min(1).max(20000).optional(),
}).refine((value) => Object.keys(value).length > 0);
export type SessionNoteCreateInput = z.infer<typeof sessionNoteCreateSchema>;
export type SessionNoteUpdateInput = z.infer<typeof sessionNoteUpdateSchema>;
