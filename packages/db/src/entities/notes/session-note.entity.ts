import { defineDomainEntity, p, type InferEntity } from '../define';

/** Session notes are not part of the E02 vault corpus. */
export const SessionNote = defineDomainEntity({
  name: 'SessionNote',
  tableName: 'session_notes',
  properties: {
    bookingId: p.uuid().index(),
    mentorId: p.uuid().index(),
    seekerId: p.uuid().index(),
    title: p.string(),
    content: p.text(),
    seekerApprovedAt: p.datetime().nullable(),
    withdrawnAt: p.datetime().nullable(),
  },
});

export type SessionNote = InferEntity<typeof SessionNote>;
