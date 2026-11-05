import { z } from 'zod';

export const bookingReconcilePaymentSchema = z.object({}).strict();

export const mockPaymentActionSchema = z.object({
  outcome: z.enum(['complete', 'fail']),
}).strict();

export type MockPaymentAction = z.infer<typeof mockPaymentActionSchema>;
