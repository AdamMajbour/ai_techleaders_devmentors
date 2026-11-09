import type { Note, NoteRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { assertOwns } from '../../http/auth';
import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import type { VaultSettings } from '../../config/env';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import type { InvitationService } from '../auth/invitation.service';
import type { Page } from '../dto';
import {
  NOTES_PAGE_SIZE,
  noteDtoSchema,
  noteSummaryDtoSchema,
  type NoteDto,
  type NoteInput,
  type NoteListQuery,
  type NotePublishInput,
  type NoteSummaryDto,
} from '../../validators/notes/note.schema';
import { VAULT_NOTICE_VERSION } from '../../validators/notes/notice';

export type { NoteDto, NoteInput, NoteSummaryDto };

type Dependencies = {
  noteRepository: NoteRepository;
  invitationService: Pick<InvitationService, 'isAcceptedMentor'>;
  eventBus: EventBus;
  clock: Clock;
  vaultSettings: () => VaultSettings;
};

function toNoteDto(note: Note): NoteDto {
  return noteDtoSchema.parse({
    id: note.id,
    title: note.title,
    body: note.body,
    status: note.status,
    aiNoticeVersion: note.aiNoticeVersion,
    aiConsentedAt: note.aiConsentedAt?.toISOString() ?? null,
    publishedAt: note.publishedAt?.toISOString() ?? null,
    takenDownAt: note.takenDownAt?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  });
}

function toSummaryDto(note: Note): NoteSummaryDto {
  const { body: _body, ...summary } = toNoteDto(note);
  return noteSummaryDtoSchema.parse(summary);
}

export class NoteService {
  private readonly noteRepository: NoteRepository;
  private readonly invitationService: Pick<InvitationService, 'isAcceptedMentor'>;
  private readonly eventBus: EventBus;
  private readonly clock: Clock;
  private readonly vaultSettings: () => VaultSettings;

  constructor({ noteRepository, invitationService, eventBus, clock, vaultSettings }: Dependencies) {
    this.noteRepository = noteRepository;
    this.invitationService = invitationService;
    this.eventBus = eventBus;
    this.clock = clock;
    this.vaultSettings = vaultSettings;
  }

  async list(session: Session, { page }: NoteListQuery): Promise<Page<NoteSummaryDto>> {
    await this.requireMentor(session);
    const { items, total } = await this.noteRepository.findPage(session.userId, {
      limit: NOTES_PAGE_SIZE,
      offset: (page - 1) * NOTES_PAGE_SIZE,
    });
    return {
      items: items.map(toSummaryDto),
      page,
      pageSize: NOTES_PAGE_SIZE,
      total,
      pageCount: Math.max(1, Math.ceil(total / NOTES_PAGE_SIZE)),
    };
  }

  async get(session: Session, id: string): Promise<NoteDto> {
    await this.requireMentor(session);
    const note = await this.find(id);
    assertOwns(session, note.mentorId);
    return toNoteDto(note);
  }

  async create(session: Session, input: NoteInput): Promise<NoteDto> {
    await this.requireMentor(session);
    const note = await this.noteRepository.create({
      mentorId: session.userId,
      ...input,
      status: 'draft',
      aiNoticeVersion: null,
      aiConsentedAt: null,
      publishedAt: null,
      takenDownAt: null,
    });
    return toNoteDto(note);
  }

  async update(session: Session, id: string, input: NoteInput): Promise<NoteDto> {
    await this.requireMentor(session);
    const existing = await this.find(id);
    assertOwns(session, existing.mentorId);
    if (existing.status === 'published') throw new ConflictError('Take the note down before editing it.');
    const updated = await this.noteRepository.updateDraft(id, session.userId, input, this.clock.now());
    if (!updated) throw new ConflictError('The note changed. Reload it before editing.');
    return toNoteDto(await this.find(id));
  }

  async remove(session: Session, id: string): Promise<{ id: string }> {
    await this.requireMentor(session);
    const note = await this.find(id);
    assertOwns(session, note.mentorId);
    if (note.status === 'published') throw new ConflictError('Take the note down before deleting it.');
    if (!(await this.noteRepository.deleteDraft(id, session.userId))) {
      throw new ConflictError('The note changed. Reload it before deleting it.');
    }
    return { id };
  }

  async publish(session: Session, id: string, input: NotePublishInput): Promise<NoteDto> {
    await this.requireMentor(session);
    if (input.noticeVersion !== VAULT_NOTICE_VERSION) {
      throw new ConflictError('The notice changed. Read it again before you publish.');
    }
    const settings = this.vaultSettings();
    if (settings.isProduction && !settings.publishEnabled) {
      throw new ForbiddenError('Publishing opens when the notice has been reviewed.');
    }
    const existing = await this.find(id);
    assertOwns(session, existing.mentorId);
    const now = this.clock.now();
    if (!(await this.noteRepository.publish(id, session.userId, VAULT_NOTICE_VERSION, now))) {
      throw new ConflictError('Only a draft or taken-down note can be published.');
    }
    await this.eventBus.emit('notes.note.published', { noteId: id, mentorId: session.userId });
    return toNoteDto(await this.find(id));
  }

  async takeDown(session: Session, id: string): Promise<NoteDto> {
    await this.requireMentor(session);
    const existing = await this.find(id);
    assertOwns(session, existing.mentorId);
    if (!(await this.noteRepository.takeDown(id, session.userId, this.clock.now()))) {
      throw new ConflictError('Only a published note can be taken down.');
    }
    await this.eventBus.emit('notes.note.taken_down', { noteId: id, mentorId: session.userId });
    return toNoteDto(await this.find(id));
  }

  private async find(id: string): Promise<Note> {
    const note = await this.noteRepository.findById(id);
    if (!note) throw new NotFoundError('Note not found.');
    return note;
  }

  private async requireMentor(session: Session): Promise<void> {
    if (!(await this.invitationService.isAcceptedMentor(session.userId))) throw new ForbiddenError();
  }
}
