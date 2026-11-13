import { z } from 'zod';

export const bookingCreateSchema = z.object({
  mentorId: z.uuid(),
  availabilitySlotId: z.uuid(),
  question: z.string().trim().min(1, 'Enter your question').max(4000, 'Use at most 4000 characters'),
  source: z.enum(['link', 'list']),
  landedAt: z.iso.datetime().optional(),
  acceptedTerms: z.literal(true),
  termsVersionId: z.uuid(),
  termsSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
