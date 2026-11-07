import { defineDomainEntity, p, type InferEntity } from '../define';

export const MentorProfile = defineDomainEntity({
  name: 'MentorProfile',
  tableName: 'mentor_profiles',
  properties: {
    userId: p.uuid().unique(),
    slug: p.string().unique(),
    headline: p.string(),
    bio: p.text(),
    technologies: p.text(),
    publicWorkUrl: p.string(),
    isListed: p.boolean(),
    lastActiveAt: p.datetime().nullable(),
  },
});

export type MentorProfile = InferEntity<typeof MentorProfile>;
