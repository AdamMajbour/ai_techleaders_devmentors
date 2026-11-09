import { z } from 'zod';

export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 20_000;
export const NOTES_PAGE_SIZE = 20;

export const noteInputSchema = z.object({
  title: z.string().trim().min(1, 'Give the note a title.').max(NOTE_TITLE_MAX, `Use at most ${NOTE_TITLE_MAX} characters in the title.`),
  body: z.string().trim().min(1, 'Write the note.').max(NOTE_BODY_MAX, `Use at most ${NOTE_BODY_MAX} characters in the note.`),
});

export const noteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const notePublishSchema = z.object({
  consent: z.literal(true),
  noticeVersion: z.string().trim().min(1).max(100),
});

export const noteTakeDownSchema = z.object({}).strict();

export const noteDtoSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  status: z.enum(['draft', 'published', 'taken_down']),
  aiNoticeVersion: z.string().nullable(),
  aiConsentedAt: z.iso.datetime().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  takenDownAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const noteSummaryDtoSchema = noteDtoSchema.omit({ body: true });

export type NoteInput = z.infer<typeof noteInputSchema>;
export type NoteListQuery = z.infer<typeof noteListQuerySchema>;
export type NotePublishInput = z.infer<typeof notePublishSchema>;
export type NoteDto = z.infer<typeof noteDtoSchema>;
export type NoteSummaryDto = z.infer<typeof noteSummaryDtoSchema>;
