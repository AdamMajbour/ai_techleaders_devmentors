import { defineDomainEntity, p, type InferEntity } from '../define';

export const MentorInvitation = defineDomainEntity({
  name: 'MentorInvitation',
  tableName: 'mentor_invitations',
  properties: {
    email: p.string(),
    displayName: p.string(),
    stackTags: p.text(),
    batchId: p.uuid().nullable(),
    accessInvitationId: p.uuid().nullable(),
    acceptedByUserId: p.uuid().nullable(),
    acceptedAt: p.datetime().nullable(),
    expiresAt: p.datetime(),
    publishDueAt: p.datetime().nullable(),
    revokedAt: p.datetime().nullable(),
  },
});

export type MentorInvitation = InferEntity<typeof MentorInvitation>;
