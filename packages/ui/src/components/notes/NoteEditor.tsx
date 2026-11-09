'use client';

import { z } from 'zod';

import type { ApiResult } from '../../backend/api/types';
import { CrudForm } from '../../backend/forms/CrudForm';
import { StatusBadge } from '../ui/status-badge';

export type NoteStatus = 'draft' | 'published' | 'taken_down';

/** The limits of the notes table in the vault spec. Keep them equal to the server schema. */
export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 20000;

export const noteInputSchema = z.object({
  title: z.string().trim().min(1, 'Give the note a title.').max(NOTE_TITLE_MAX, `Use at most ${NOTE_TITLE_MAX} characters in the title.`),
  body: z.string().trim().min(1, 'Write the note.').max(NOTE_BODY_MAX, `Use at most ${NOTE_BODY_MAX} characters in the note.`),
});

const STATUS: Record<NoteStatus, { tone: 'neutral' | 'active'; text: string }> = {
  draft: { tone: 'neutral', text: 'Draft' },
  published: { tone: 'active', text: 'Published' },
  taken_down: { tone: 'neutral', text: 'Taken down' },
};

export function noteStatusLabel(status: NoteStatus) {
  return STATUS[status];
}

export interface NoteEditorProps {
  /** Leave out for a new note: no status badge is shown. */
  status?: NoteStatus;
  initialValues?: { title: string; body: string };
  /** The app passes the shared core validator used by the API routes. */
  schema?: z.ZodType<z.output<typeof noteInputSchema>>;
  /** Saves the note. Resolves to the `apiCall` result. The status is never sent: publishing is its own action. */
  onSave: (values: z.output<typeof noteInputSchema>) => Promise<ApiResult<unknown>>;
  onSuccess?: (data: unknown) => void;
  onCancel?: () => void;
}

// The editor of one note. It is the Form pattern (CrudForm with the shared schema), plus the status of the note.
// Saving never publishes: a note feeds AI answers only after the mentor accepts the notice in PublishNoticePanel.
export function NoteEditor({ status, initialValues, schema = noteInputSchema, onSave, onSuccess, onCancel }: NoteEditorProps) {
  return (
    <div className="flex flex-col gap-between-groups">
      {status ? (
        <p className="m-0 flex items-center gap-group text-label text-muted-foreground">
          Status <StatusBadge tone={STATUS[status].tone}>{STATUS[status].text}</StatusBadge>
        </p>
      ) : null}
      <CrudForm
        schema={schema}
        fields={[
          { name: 'title', label: 'Title', requirement: 'required' },
          {
            name: 'body',
            label: 'Note',
            type: 'textarea',
            requirement: 'required',
            hint: 'Markdown. Put code between triple backticks. Seekers see your name and this title next to an answer that uses the note, not the note itself.',
          },
        ]}
        initialValues={initialValues}
        onSubmit={onSave}
        onSuccess={onSuccess}
        onCancel={onCancel}
        submitLabel={status === 'draft' || status === undefined ? 'Save draft' : 'Save changes'}
      />
    </div>
  );
}
