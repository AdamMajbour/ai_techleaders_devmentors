import { defineDomainEntity, p, type InferEntity } from '../define';

export const User = defineDomainEntity({
  name: 'User',
  tableName: 'users',
  properties: {
    email: p.string().unique(),
    name: p.string(),
    avatar: p.string().nullable(),
    // bcrypt hash. Nullable: users created without a password cannot log in. Hidden from serialization.
    passwordHash: p.string().hidden().nullable(),
  },
});

export type User = InferEntity<typeof User>;
