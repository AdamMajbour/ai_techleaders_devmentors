import { type EntityManager, type RequiredEntityData } from '@mikro-orm/core';
import { InvitationBatch, type InvitationBatch as InvitationBatchRecord } from '../entities/invitations/invitation-batch.entity';

export type NewInvitationBatch = Pick<
  InvitationBatchRecord,
  'number' | 'openedBy' | 'openedAt' | 'closedAt' | 'resumedAt' | 'resumedBy'
>;

export class InvitationBatchRepository {
  constructor(private readonly em: EntityManager) {}

  async lockWorkflow(): Promise<void> {
    await this.em.getConnection().execute('select pg_advisory_xact_lock(20261115, 1)');
  }

  findAll(): Promise<InvitationBatchRecord[]> {
    return this.em.find(InvitationBatch, {}, { orderBy: { number: 'desc' } });
  }

  findOpen(): Promise<InvitationBatchRecord | null> {
    return this.em.findOne(InvitationBatch, { closedAt: null });
  }

  findLatest(): Promise<InvitationBatchRecord | null> {
    return this.em.findOne(InvitationBatch, {}, { orderBy: { number: 'desc' } });
  }

  async create(data: NewInvitationBatch): Promise<InvitationBatchRecord> {
    const batch = this.em.create(InvitationBatch, data as RequiredEntityData<InvitationBatchRecord>);
    this.em.persist(batch);
    await this.em.flush();
    return batch;
  }

  async close(id: string, closedAt: Date): Promise<void> {
    await this.em.nativeUpdate(InvitationBatch, { id, closedAt: null }, { closedAt, updatedAt: closedAt });
  }
}
