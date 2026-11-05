import { z } from 'zod';

export const bookingListQuerySchema = z.object({
  role: z.enum(['seeker', 'mentor']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
