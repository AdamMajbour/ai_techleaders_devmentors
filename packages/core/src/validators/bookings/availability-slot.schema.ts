import { z } from 'zod';

export const availabilitySlotCreateSchema = z.object({
  startsAt: z.iso.datetime(),
});

export type AvailabilitySlotCreateInput = z.infer<typeof availabilitySlotCreateSchema>;
