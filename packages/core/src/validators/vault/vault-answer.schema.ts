import { z } from 'zod';

export const vaultAnswerCreateSchema = z.object({
  question: z.string().trim().min(1).max(2000),
});

export const vaultAnswerIdSchema = z.object({ id: z.uuid() });

export const vaultAnswerDtoSchema = z.object({
  id: z.uuid(),
  status: z.enum([
    'pending_payment', 'payment_failed', 'paid', 'generating', 'generation_failed',
    'pending_preview', 'rejected', 'expired', 'cancelled', 'released',
  ]),
  question: z.string().max(2000),
  priceMinor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  answerText: z.string().optional(),
  citations: z.array(z.object({ noteId: z.uuid(), mentorName: z.string(), noteTitle: z.string() })).optional(),
  failureReason: z.enum(['unanswerable', 'refused', 'invalid_output', 'unavailable', 'config']).optional(),
  allowedActions: z.array(z.string()),
  canDecide: z.boolean().optional(),
  reviewExpiresAt: z.iso.datetime().optional(),
  refundStatus: z.enum(['none', 'pending_approval', 'processing', 'refunded']).optional(),
  ownNoteTitle: z.string().optional(),
  otherMentors: z.array(z.string()).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const vaultAnswerPageSchema = z.object({
  items: z.array(vaultAnswerDtoSchema),
  serverTime: z.iso.datetime(),
});

export type VaultAnswerCreateInput = z.infer<typeof vaultAnswerCreateSchema>;
export type VaultAnswerDto = z.infer<typeof vaultAnswerDtoSchema>;
