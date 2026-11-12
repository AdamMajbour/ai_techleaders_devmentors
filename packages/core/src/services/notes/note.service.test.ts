/** @jest-environment node */
import type { Note, NoteRepository } from '@devmentor/db';
import { createEventBus } from '../../events/event-bus';
import { createLogger } from '../../logger';
import { ForbiddenError, ConflictError } from '../../http/errors';
import type { Clock } from '../../utils/clock';
import { VAULT_NOTICE_VERSION } from '../../validators/notes/notice';
import { NoteService } from './note.service';

const IDS = {
  note: '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  other: '1c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  mentor: '2c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
};
const NOW = new Date('2026-11-09T12:00:00.000Z');
const SESSION = { userId: IDS.mentor };

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: IDS.note,
    mentorId: IDS.mentor,
    title: 'Safe Kubernetes upgrades',
    body: 'Read the events first.',
    status: 'draft',
    aiNoticeVersion: null,
    aiConsentedAt: null,
    publishedAt: null,
    takenDownAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Note;
}

function setup(options: {
  isMentor?: boolean;
  settings?: { enabled: boolean; publishEnabled: boolean; isProduction: boolean };
  initialNote?: Note;
} = {}) {
  let current = options.initialNote ?? note();
  const repository = {
    findById: jest.fn(async () => current),
    findPage: jest.fn(async () => ({ items: [current], total: 1 })),
    create: jest.fn(async (data: Partial<Note>) => {
      current = note({ ...data, id: IDS.note } as Partial<Note>);
      return current;
    }),
    updateDraft: jest.fn(async () => true),
    deleteDraft: jest.fn(async () => true),
    publish: jest.fn(async (_id: string, _mentorId: string, version: string, at: Date) => {
      current = note({ ...current, status: 'published', aiNoticeVersion: version, aiConsentedAt: at, publishedAt: at });
      return true;
    }),
    takeDown: jest.fn(async (_id: string, _mentorId: string, at: Date) => {
      current = note({ ...current, status: 'taken_down', takenDownAt: at });
      return true;
    }),
  };
  const eventBus = createEventBus(createLogger(() => undefined));
  const emit = jest.spyOn(eventBus, 'emit');
  const invitationService = { isAcceptedMentor: jest.fn(async () => options.isMentor ?? true) };
  const clock: Clock = { now: () => new Date(NOW) };
  const vaultSettings = jest.fn(() => options.settings ?? { enabled: false, publishEnabled: false, isProduction: false });
  const service = new NoteService({
    noteRepository: repository as unknown as NoteRepository,
    invitationService,
    eventBus,
    clock,
    vaultSettings,
  });
  return { service, repository, invitationService, emit, vaultSettings };
}

describe('NoteService', () => {
  it('attributes a new draft to the signed-in mentor and never takes an author id from input', async () => {
    const { service, repository } = setup();
    const created = await service.create(SESSION, { title: 'Short note', body: 'Useful content.' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ mentorId: IDS.mentor, status: 'draft', title: 'Short note' }));
    expect(created.status).toBe('draft');
    expect(created.aiConsentedAt).toBeNull();
  });

  it('rejects non-mentors before reading or writing notes', async () => {
    const { service, repository } = setup({ isMentor: false });
    await expect(service.list(SESSION, { page: 1 })).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.findPage).not.toHaveBeenCalled();
  });

  it('checks note ownership before returning or mutating it', async () => {
    const { service } = setup({ initialNote: note({ mentorId: IDS.other }) });
    await expect(service.get(SESSION, IDS.note)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.update(SESSION, IDS.note, { title: 'Changed', body: 'Changed body.' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('refuses consent with a stale notice version before changing the note', async () => {
    const { service, repository } = setup();
    await expect(service.publish(SESSION, IDS.note, { consent: true, noticeVersion: 'old-version' }))
      .rejects.toThrow('The notice changed. Read it again before you publish.');
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('keeps production publishing closed until the notice review flag is enabled', async () => {
    const { service, repository } = setup({ settings: { enabled: false, publishEnabled: false, isProduction: true } });
    await expect(service.publish(SESSION, IDS.note, { consent: true, noticeVersion: VAULT_NOTICE_VERSION }))
      .rejects.toThrow('Publishing opens when the notice has been reviewed.');
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('returns the server publication gate so the UI matches enabled production configuration', async () => {
    const closed = setup({ settings: { enabled: false, publishEnabled: false, isProduction: true } });
    await expect(closed.service.get(SESSION, IDS.note)).resolves.toMatchObject({ canPublish: false });

    const open = setup({ settings: { enabled: false, publishEnabled: true, isProduction: true } });
    await expect(open.service.get(SESSION, IDS.note)).resolves.toMatchObject({ canPublish: true });
  });

  it('records fresh versioned consent and emits only note and mentor ids on publish', async () => {
    const { service, repository, emit } = setup();
    const published = await service.publish(SESSION, IDS.note, { consent: true, noticeVersion: VAULT_NOTICE_VERSION });
    expect(repository.publish).toHaveBeenCalledWith(IDS.note, IDS.mentor, VAULT_NOTICE_VERSION, NOW);
    expect(published).toMatchObject({ status: 'published', aiNoticeVersion: VAULT_NOTICE_VERSION, aiConsentedAt: NOW.toISOString() });
    expect(emit).toHaveBeenCalledWith('notes.note.published', { noteId: IDS.note, mentorId: IDS.mentor });
  });

  it('allows published notes to be taken down and emits an id-only event', async () => {
    const { service, emit } = setup({ initialNote: note({ status: 'published', aiNoticeVersion: VAULT_NOTICE_VERSION, aiConsentedAt: NOW }) });
    const result = await service.takeDown(SESSION, IDS.note);
    expect(result).toMatchObject({ status: 'taken_down', takenDownAt: NOW.toISOString() });
    expect(emit).toHaveBeenCalledWith('notes.note.taken_down', { noteId: IDS.note, mentorId: IDS.mentor });
  });

  it('requires a published note to be taken down before edit or delete', async () => {
    const { service, repository } = setup({ initialNote: note({ status: 'published', aiNoticeVersion: VAULT_NOTICE_VERSION, aiConsentedAt: NOW }) });
    await expect(service.update(SESSION, IDS.note, { title: 'Changed', body: 'Changed body.' })).rejects.toBeInstanceOf(ConflictError);
    await expect(service.remove(SESSION, IDS.note)).rejects.toBeInstanceOf(ConflictError);
    expect(repository.updateDraft).not.toHaveBeenCalled();
    expect(repository.deleteDraft).not.toHaveBeenCalled();
  });
});
