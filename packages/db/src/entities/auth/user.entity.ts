import { defineDomainEntity, p, type InferEntity } from '../define';

export const User = defineDomainEntity({
  name: 'User',
  tableName: 'users',
  properties: {
    email: p.string().unique(),
    name: p.string(),
    avatar: p.string().nullable(),
  },
});

export type User = InferEntity<typeof User>;
