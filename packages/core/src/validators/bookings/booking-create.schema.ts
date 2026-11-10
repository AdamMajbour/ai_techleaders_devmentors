import { z } from 'zod';

export const bookingCreateSchema = z.object({
  mentorId: z.uuid(),
  availabilitySlotId: z.uuid(),
  question: z.string().trim().min(1, 'Enter your question').max(4000, 'Use at most 4000 characters'),
  source: z.enum(['link', 'list']),
  landedAt: z.iso.datetime().optional(),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
