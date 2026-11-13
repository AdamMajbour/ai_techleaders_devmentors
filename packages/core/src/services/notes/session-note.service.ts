import type { SessionNoteRepository } from '@devmentor/db';
import { assertOwns } from '../../http/auth';
import { NotFoundError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { SessionNoteCreateInput, SessionNoteUpdateInput } from '../../validators/notes/session-note.schema';
import { toSessionNoteDto, type SessionNoteDto } from '../dto';

export class SessionNoteService {
  constructor(private readonly deps: { sessionNoteRepository: SessionNoteRepository }) {}
  async list(session: Session): Promise<SessionNoteDto[]> {
    return (await this.deps.sessionNoteRepository.findByMentor(session.userId)).map(toSessionNoteDto);
  }
  async create(session: Session, input: SessionNoteCreateInput): Promise<SessionNoteDto> {
    return toSessionNoteDto(await this.deps.sessionNoteRepository.create({
      ...input, mentorId: session.userId, seekerApprovedAt: null, withdrawnAt: null,
    }));
  }
  async update(session: Session, id: string, input: SessionNoteUpdateInput): Promise<SessionNoteDto> {
    await this.findOwned(session, id);
    const updated = await this.deps.sessionNoteRepository.update(id, { ...input, seekerApprovedAt: null });
    if (!updated) throw new NotFoundError('Session note not found.');
    return toSessionNoteDto(updated);
  }
  async setSeekerApproval(session: Session, id: string, approved: boolean): Promise<SessionNoteDto> {
    await this.findOwned(session, id);
    const updated = await this.deps.sessionNoteRepository.update(id, {
      seekerApprovedAt: approved ? new Date() : null,
      withdrawnAt: approved ? null : new Date(),
    });
    if (!updated) throw new NotFoundError('Session note not found.');
    return toSessionNoteDto(updated);
  }
  async remove(session: Session, id: string): Promise<{ id: string }> {
    await this.findOwned(session, id);
    await this.deps.sessionNoteRepository.delete(id);
    return { id };
  }
  private async findOwned(session: Session, id: string) {
    const note = await this.deps.sessionNoteRepository.findById(id);
    if (!note) throw new NotFoundError('Session note not found.');
    assertOwns(session, note.mentorId);
    return note;
  }
}
