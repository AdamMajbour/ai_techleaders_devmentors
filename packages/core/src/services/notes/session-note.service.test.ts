/** @jest-environment node */
import type { SessionNote, SessionNoteRepository } from '@devmentor/db';
import { ForbiddenError, NotFoundError } from '../../http/errors';
import { SessionNoteService } from './session-note.service';

const ME = { userId: 'mentor-1' };
const stored = (overrides: Partial<SessionNote> = {}) => ({
  id: 'note-1', sessionId: 'session-1', mentorId: 'mentor-1', title: 'A note', content: 'Private',
  seekerApprovedAt: null, withdrawnAt: null,
  createdAt: new Date('2026-11-01T00:00:00Z'), updatedAt: new Date('2026-11-01T00:00:00Z'),
  ...overrides,
}) as SessionNote;
function setup(repository: Partial<Record<keyof SessionNoteRepository, jest.Mock>> = {}) {
  return new SessionNoteService({ sessionNoteRepository: repository as unknown as SessionNoteRepository });
}

describe('SessionNoteService', () => {
  it('creates private notes with the authenticated mentor as owner', async () => {
    const create = jest.fn(async (data) => stored(data));
    const service = setup({ create });
    const note = await service.create(ME, { sessionId: 'session-1', title: 'T', content: 'C' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mentorId: ME.userId, seekerApprovedAt: null, withdrawnAt: null }));
    expect(note.seekerApprovedAt).toBeNull();
  });

  it('lists only through the current mentor id', async () => {
    const findByMentor = jest.fn(async () => [stored()]);
    const service = setup({ findByMentor });
    expect((await service.list(ME)).map(({ id }) => id)).toEqual(['note-1']);
    expect(findByMentor).toHaveBeenCalledWith(ME.userId);
  });

  it('rejects edits and deletion by another user without writing', async () => {
    const update = jest.fn(); const deleteNote = jest.fn();
    const service = setup({ findById: jest.fn(async () => stored({ mentorId: 'mentor-2' })), update, delete: deleteNote });
    await expect(service.update(ME, 'note-1', { title: 'Changed' })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.remove(ME, 'note-1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(update).not.toHaveBeenCalled(); expect(deleteNote).not.toHaveBeenCalled();
  });

  it('clears any stale approval on edits', async () => {
    const update = jest.fn(async (_id, data) => stored(data));
    const service = setup({ findById: jest.fn(async () => stored({ seekerApprovedAt: new Date() })), update });
    await service.update(ME, 'note-1', { content: 'Changed' });
    expect(update).toHaveBeenCalledWith('note-1', { content: 'Changed', seekerApprovedAt: null });
  });

  it('returns not found for a missing note', async () => {
    const service = setup({ findById: jest.fn(async () => null) });
    await expect(service.remove(ME, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
