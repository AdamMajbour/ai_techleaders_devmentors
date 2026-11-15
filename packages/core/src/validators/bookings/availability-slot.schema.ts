import { z } from 'zod';

export const availabilitySlotCreateSchema = z.object({
  startsAt: z.iso.datetime(),
  durationMinutes: z.union([z.literal(25), z.literal(50)]).default(25),
});

export type AvailabilitySlotCreateInput = z.infer<typeof availabilitySlotCreateSchema>;
