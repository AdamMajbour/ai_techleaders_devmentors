import { defineDomainEntity, p, type InferEntity } from '../define';

export const InvitationBatch = defineDomainEntity({
  name: 'InvitationBatch',
  tableName: 'invitation_batches',
  properties: {
    number: p.integer().unique(),
    openedBy: p.uuid(),
    openedAt: p.datetime(),
    closedAt: p.datetime().nullable(),
    resumedAt: p.datetime().nullable(),
    resumedBy: p.uuid().nullable(),
  },
});

export type InvitationBatch = InferEntity<typeof InvitationBatch>;
