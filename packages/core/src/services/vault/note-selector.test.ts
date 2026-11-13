import type { NoteRepository, UserRepository } from '@devmentor/db';
import { NoteSelector } from './note-selector';

describe('NoteSelector', () => {
  it('caps newest notes, excludes the seeker notes through the repository, and orders selected ids deterministically', async () => {
    const findVaultCorpus = jest.fn().mockResolvedValue([
      { id: 'note-c', mentorId: 'mentor-2', title: 'C', body: 'newest', createdAt: new Date('2026-01-03') },
      { id: 'note-b', mentorId: 'mentor-1', title: 'B', body: 'middle', createdAt: new Date('2026-01-02') },
      { id: 'note-a', mentorId: 'mentor-1', title: 'A', body: 'older', createdAt: new Date('2026-01-01') },
    ]);
    const findByIds = jest.fn().mockResolvedValue([
      { id: 'mentor-1', name: 'One' },
      { id: 'mentor-2', name: 'Two' },
    ]);
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const selector = new NoteSelector({
      noteRepository: { findVaultCorpus } as unknown as NoteRepository,
      userRepository: { findByIds } as unknown as UserRepository,
      logger,
      maxCorpusChars: 12,
    });

    const notes = await selector.selectFor('seeker-1');
    expect(findVaultCorpus).toHaveBeenCalledWith('seeker-1');
    expect(notes.map((note) => note.id)).toEqual(['note-b', 'note-c']);
    expect(notes[0].mentorName).toBe('One');
    expect(logger.warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ omittedCount: 1 }));
  });
});
