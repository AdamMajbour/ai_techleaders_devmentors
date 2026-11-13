import type { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { SessionNote } from '../entities';

export class SessionNoteRepository {
  constructor(private readonly em: EntityManager) {}
  findById(id: string) { return this.em.findOne(SessionNote, { id }); }
  findByMentor(mentorId: string) {
    return this.em.find(SessionNote, { mentorId }, { orderBy: { createdAt: 'desc', id: 'asc' } });
  }
  async create(data: RequiredEntityData<SessionNote>) {
    const note = this.em.create(SessionNote, data);
    this.em.persist(note);
    await this.em.flush();
    return note;
  }
  async update(id: string, data: Partial<Pick<SessionNote, 'title' | 'content' | 'seekerApprovedAt' | 'withdrawnAt'>>) {
    const note = await this.findById(id);
    if (!note) return null;
    Object.assign(note, data);
    await this.em.flush();
    return note;
  }
  async delete(id: string) {
    const note = await this.findById(id);
    if (!note) return false;
    this.em.remove(note);
    await this.em.flush();
    return true;
  }
}
