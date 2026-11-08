import { z } from 'zod';

export const MENTOR_PAGE_SIZE = 10;

export const mentorListQuerySchema = z.object({
  technology: z.string().trim().max(80).optional(),
  slug: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const mentorProfileInputSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  headline: z.string().trim().min(1).max(140),
  bio: z.string().trim().min(1).max(5000),
  technologies: z.string().trim().min(1).max(500),
  publicWorkUrl: z.url(),
  isListed: z.boolean().optional(),
});

export const mentorProfileUpdateSchema = mentorProfileInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one profile field is required.');

export const mentorActivitySchema = z.enum(['within_hour', 'today', 'earlier', 'never']);

export const mentorProfileDtoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  headline: z.string(),
  bio: z.string(),
  technologies: z.string(),
  publicWorkUrl: z.url(),
  isListed: z.boolean(),
  activity: mentorActivitySchema,
});

export type MentorListQuery = z.infer<typeof mentorListQuerySchema>;
export type MentorProfileInput = z.infer<typeof mentorProfileInputSchema>;
export type MentorProfileUpdateInput = z.infer<typeof mentorProfileUpdateSchema>;
export type MentorActivity = z.infer<typeof mentorActivitySchema>;
export type MentorProfileDto = z.infer<typeof mentorProfileDtoSchema>;
