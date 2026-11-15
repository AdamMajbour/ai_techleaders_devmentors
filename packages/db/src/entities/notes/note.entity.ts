import { defineDomainEntity, p, type InferEntity } from '../define';

export const Note = defineDomainEntity({
  name: 'Note',
  tableName: 'notes',
  properties: {
    mentorId: p.uuid(),
    title: p.string(),
    body: p.text(),
    status: p.string(),
    aiNoticeVersion: p.string().nullable(),
    aiConsentedAt: p.datetime().nullable(),
    publishedAt: p.datetime().nullable(),
    takenDownAt: p.datetime().nullable(),
  },
});

export type Note = InferEntity<typeof Note>;
