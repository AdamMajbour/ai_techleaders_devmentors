import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiResult } from '../../backend/api/types';
import { NOTE_BODY_MAX, NOTE_TITLE_MAX, NoteEditor, noteInputSchema, noteStatusLabel } from './NoteEditor';

const ok: ApiResult<unknown> = { ok: true, status: 200, data: {} };

describe('noteInputSchema', () => {
  it('trims and accepts a title and a body within the limits', () => {
    expect(noteInputSchema.parse({ title: '  Ingress  ', body: ' text ' })).toEqual({ title: 'Ingress', body: 'text' });
  });

  it('refuses an empty title, an empty body and values over the limits of the notes table', () => {
    expect(noteInputSchema.safeParse({ title: ' ', body: 'x' }).success).toBe(false);
    expect(noteInputSchema.safeParse({ title: 'x', body: ' ' }).success).toBe(false);
    expect(noteInputSchema.safeParse({ title: 'x'.repeat(NOTE_TITLE_MAX + 1), body: 'x' }).success).toBe(false);
    expect(noteInputSchema.safeParse({ title: 'x', body: 'x'.repeat(NOTE_BODY_MAX + 1) }).success).toBe(false);
    expect(noteInputSchema.safeParse({ title: 'x'.repeat(NOTE_TITLE_MAX), body: 'x'.repeat(NOTE_BODY_MAX) }).success).toBe(true);
  });
});

describe('NoteEditor', () => {
  it('saves the trimmed values and sends no status', async () => {
    const onSave = jest.fn(async () => ok);
    render(<NoteEditor onSave={onSave} />);
    await userEvent.type(screen.getByLabelText(/Title/), ' Ingress upgrades ');
    await userEvent.type(screen.getByLabelText(/Note/), 'Check the webhook first.');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ title: 'Ingress upgrades', body: 'Check the webhook first.' }));
  });

  it('says what is missing and does not save', async () => {
    const onSave = jest.fn(async () => ok);
    render(<NoteEditor onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Give the note a title.')).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the status in words, and none for a new note', () => {
    const { rerender } = render(<NoteEditor onSave={async () => ok} />);
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    rerender(<NoteEditor status="published" onSave={async () => ok} />);
    expect(screen.getByText('Published')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeVisible();
  });

  it('tells the mentor what the seeker sees of the note', () => {
    render(<NoteEditor onSave={async () => ok} />);
    expect(screen.getByLabelText(/Note/)).toHaveAccessibleDescription(/Seekers see your name and this title next to an answer that uses the note, not the note itself\./);
  });

  it('labels every status', () => {
    expect(noteStatusLabel('draft').text).toBe('Draft');
    expect(noteStatusLabel('taken_down').text).toBe('Taken down');
  });
});
