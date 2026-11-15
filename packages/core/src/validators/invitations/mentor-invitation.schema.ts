import { z } from 'zod';

export const STACK_TAGS = ['typescript', 'nextjs', 'node-js', 'python'] as const;
export type StackTag = (typeof STACK_TAGS)[number];

const invitationEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email must be 254 characters or fewer.')
  .email('Enter a valid email address.')
  .refine((email) => {
    const domain = email.split('@')[1];
    return domain !== undefined && domain.includes('.');
  }, 'Enter a valid email address.');

export const mentorInvitationCreateSchema = z.object({
  email: invitationEmailSchema,
  stackTags: z.array(z.enum(STACK_TAGS)).min(1, 'Choose at least one stack tag.').max(4).refine(
    (tags) => new Set(tags).size === tags.length,
    'Stack tags must be unique.',
  ),
}).strict();

export type MentorInvitationCreateInput = z.infer<typeof mentorInvitationCreateSchema>;
