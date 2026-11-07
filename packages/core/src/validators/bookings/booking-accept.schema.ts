import { z } from 'zod';

export const bookingAcceptSchema = z.object({
  startsAt: z.iso.datetime().optional(),
}).strict();

export const bookingDeclineSchema = z.object({}).strict();

export type BookingAcceptInput = z.infer<typeof bookingAcceptSchema>;
