import { z } from 'zod';

export const termsKindSchema = z.enum(['seeker', 'mentor']);
export const termsDraftSchema = z.object({
  kind: termsKindSchema,
  version: z.string().trim().min(1).max(64),
  body: z.string().trim().min(1).max(100_000),
});
export const termsReviewSchema = z.object({
  termsVersionId: z.uuid(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewer: z.string().trim().min(1).max(255),
  scopes: z.array(z.enum(['terms', 'payment_handling', 'ai_notice_and_processors'])).min(1),
  outcome: z.enum(['pass', 'fail']),
  note: z.string().max(1000).optional(),
});
export const termsAcceptSchema = z.object({
  kind: termsKindSchema,
  versionId: z.uuid(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
