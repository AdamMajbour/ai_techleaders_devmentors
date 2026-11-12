import { z } from 'zod';

export const bookingAcceptSchema = z.object({}).strict();

export const bookingDeclineSchema = z.object({}).strict();

export type BookingAcceptInput = z.infer<typeof bookingAcceptSchema>;
