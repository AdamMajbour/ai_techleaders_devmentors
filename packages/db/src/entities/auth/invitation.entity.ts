import { defineDomainEntity, p, type InferEntity } from '../define';

export const Invitation = defineDomainEntity({
  name: 'Invitation',
  tableName: 'invitations',
  properties: {
    email: p.string().unique(),
    displayName: p.string(),
    role: p.string(),
    invitedBy: p.uuid().nullable(),
    acceptedByUserId: p.uuid().nullable(),
    acceptedAt: p.datetime().nullable(),
    revokedAt: p.datetime().nullable(),
  },
});

export type Invitation = InferEntity<typeof Invitation>;
