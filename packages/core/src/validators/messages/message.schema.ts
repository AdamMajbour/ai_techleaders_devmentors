import { z } from 'zod';

export const messageBodySchema = z.string().min(1).max(2000).refine((body) => body.trim().length > 0);
