/** @jest-environment node */
import type { SessionNote, SessionNoteRepository } from '@devmentor/db';
import { ForbiddenError, NotFoundError } from '../../http/errors';
import { SessionNoteService } from './session-note.service';

const ME = { userId: 'mentor-1' };
const stored = (overrides: Partial<SessionNote> = {}) => ({
  id: 'note-1', bookingId: 'b1', mentorId: 'mentor-1', title: 'A note', content: 'Private', seekerId: 'seeker-1',
  seekerApprovedAt: null, withdrawnAt: null,
  createdAt: new Date('2026-11-01T00:00:00Z'), updatedAt: new Date('2026-11-01T00:00:00Z'),
  ...overrides,
}) as SessionNote;
function setup(repository: Partial<Record<keyof SessionNoteRepository, jest.Mock>> = {}, booking: { getForNote: jest.Mock } = { getForNote: jest.fn(async () => ({ id: 'b1', mentorId: 'mentor-1', seekerId: 'seeker-1', status: 'accepted' })) }) {
  return new SessionNoteService({ sessionNoteRepository: repository as unknown as SessionNoteRepository, bookingService: booking as never });
}

describe('SessionNoteService', () => {
  it('creates private notes with the authenticated mentor as owner', async () => {
    const create = jest.fn(async (data) => stored(data));
    const service = setup({ create });
    const note = await service.create(ME, { bookingId: 'b1', title: 'T', content: 'C' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ bookingId: 'b1', mentorId: 'mentor-1', seekerId: 'seeker-1', seekerApprovedAt: null, withdrawnAt: null }));
    expect(note.seekerApprovedAt).toBeNull();
  });


  it('rejects a booking when the caller is not a participant', async () => {
    const create = jest.fn();
    const service = setup({ create }, { getForNote: jest.fn(async () => null) });
    await expect(service.create({ userId: 'stranger' }, { bookingId: 'b1', title: 'T', content: 'C' })).rejects.toBeInstanceOf(NotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects seeker note creation even when the seeker belongs to the booking', async () => {
    const create = jest.fn();
    const service = setup({ create }, { getForNote: jest.fn(async () => ({ id: 'b1', mentorId: 'mentor-1', seekerId: 'seeker-1', status: 'accepted' })) });
    await expect(service.create({ userId: 'seeker-1' }, { bookingId: 'b1', title: 'T', content: 'C' })).rejects.toBeInstanceOf(NotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lists only through the current mentor id', async () => {
    const findByUser = jest.fn(async () => [stored()]);
    const service = setup({ findByUser });
    expect((await service.list(ME)).map(({ id }) => id)).toEqual(['note-1']);
    expect(findByUser).toHaveBeenCalledWith(ME.userId);
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

  it('lets the assigned seeker read and approve or withdraw consent, while hiding notes from others', async () => {
    const update = jest.fn(async (_id, data) => stored(data));
    const repository = { findById: jest.fn(async () => stored()), update };
    const service = setup(repository);
    const seeker = { userId: 'seeker-1' };
    expect((await service.get(seeker, 'note-1')).content).toBe('Private');
    await expect(service.get({ userId: 'stranger' }, 'note-1')).rejects.toBeInstanceOf(NotFoundError);
    const approved = await service.approve(seeker, 'note-1', true);
    expect(approved.seekerApprovedAt).toEqual(expect.any(String));
    const revoked = await service.approve(seeker, 'note-1', false);
    expect(revoked.withdrawnAt).toEqual(expect.any(String));
    await expect(service.approve({ userId: 'mentor-1' }, 'note-1', true)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns not found for a missing note', async () => {
    const service = setup({ findById: jest.fn(async () => null) });
    await expect(service.remove(ME, 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
