import { z } from 'zod';

export const pilotMetricsQuerySchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
});
