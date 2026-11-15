import { type EntityManager, type RequiredEntityData } from '@mikro-orm/core';
import { Invitation, MentorInvitation, type MentorInvitation as MentorInvitationRecord } from '../entities';

export type NewMentorInvitation = Pick<
  MentorInvitationRecord,
  | 'email'
  | 'displayName'
  | 'stackTags'
  | 'batchId'
  | 'accessInvitationId'
  | 'acceptedByUserId'
  | 'acceptedAt'
  | 'expiresAt'
  | 'publishDueAt'
  | 'revokedAt'
>;

export class MentorInvitationRepository {
  constructor(private readonly em: EntityManager) {}

  findAll(): Promise<MentorInvitationRecord[]> {
    return this.em.find(MentorInvitation, {}, { orderBy: { createdAt: 'desc', id: 'asc' } });
  }

  findById(id: string): Promise<MentorInvitationRecord | null> {
    return this.em.findOne(MentorInvitation, { id });
  }

  async findUnresolvedByEmail(email: string, now: Date): Promise<MentorInvitationRecord | null> {
    return this.em.findOne(
      MentorInvitation,
      { email, acceptedAt: null, revokedAt: null, expiresAt: { $gt: now } },
      { orderBy: { createdAt: 'desc' } },
    );
  }

  async create(data: NewMentorInvitation): Promise<MentorInvitationRecord> {
    const invitation = this.em.create(MentorInvitation, data as RequiredEntityData<MentorInvitationRecord>);
    this.em.persist(invitation);
    await this.em.flush();
    return invitation;
  }

  async acceptLatest(email: string, userId: string, acceptedAt: Date, publishDueAt: Date): Promise<boolean> {
    const candidate = await this.em.findOne(
      MentorInvitation,
      { email, acceptedAt: null, revokedAt: null, expiresAt: { $gt: acceptedAt } },
      { orderBy: { createdAt: 'desc' } },
    );
    if (!candidate) return false;
    return (await this.em.nativeUpdate(
      MentorInvitation,
      { id: candidate.id, acceptedAt: null, revokedAt: null, expiresAt: { $gt: acceptedAt } },
      { acceptedByUserId: userId, acceptedAt, publishDueAt, updatedAt: acceptedAt },
    )) === 1;
  }

  async listLegacyMentorInvitations(): Promise<MentorInvitationRecord[]> {
    return this.em.find(
      MentorInvitation,
      { batchId: null },
      { orderBy: { createdAt: 'desc', id: 'asc' } },
    );
  }

  async hasAcceptedMentor(userId: string): Promise<boolean> {
    return (await this.em.count(MentorInvitation, { acceptedByUserId: userId, acceptedAt: { $ne: null }, revokedAt: null })) > 0;
  }

  async findAccessInvitationByEmail(email: string): Promise<{ id: string; displayName: string; role: string; acceptedByUserId: string | null } | null> {
    const invitation = await this.em.findOne(Invitation, { email, revokedAt: null });
    return invitation ? {
      id: invitation.id,
      displayName: invitation.displayName,
      role: invitation.role,
      acceptedByUserId: invitation.acceptedByUserId ?? null,
    } : null;
  }
}
