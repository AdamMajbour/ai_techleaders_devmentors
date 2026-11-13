import { z } from 'zod';

export const retentionHoldCreateSchema = z.object({
  contentType: z.enum(['message', 'booking_question', 'note', 'vault_question', 'vault_answer', 'citation']),
  contentId: z.uuid(),
  reason: z.string().trim().min(5).max(2000),
});

export const retentionHoldReleaseSchema = z.object({
  reason: z.string().trim().min(5).max(2000),
});
