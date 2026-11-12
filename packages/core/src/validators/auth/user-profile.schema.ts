import { z } from 'zod';

export const userProfileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(100, 'Use at most 100 characters'),
});

export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
