import { noteInputSchema, notePublishSchema, NOTE_BODY_MAX, NOTE_TITLE_MAX } from './note.schema';

describe('note validators', () => {
  it('accepts a bounded title and markdown body and trims both', () => {
    expect(noteInputSchema.parse({ title: '  Safe note ', body: '  Markdown body  ' })).toEqual({ title: 'Safe note', body: 'Markdown body' });
    expect(noteInputSchema.safeParse({ title: 'x'.repeat(NOTE_TITLE_MAX + 1), body: 'body' }).success).toBe(false);
    expect(noteInputSchema.safeParse({ title: 'title', body: 'x'.repeat(NOTE_BODY_MAX + 1) }).success).toBe(false);
  });

  it('requires literal consent and a notice version', () => {
    expect(notePublishSchema.safeParse({ consent: true, noticeVersion: 'working-draft-1' }).success).toBe(true);
    expect(notePublishSchema.safeParse({ consent: false, noticeVersion: 'working-draft-1' }).success).toBe(false);
    expect(notePublishSchema.safeParse({ consent: true, noticeVersion: '' }).success).toBe(false);
  });
});
