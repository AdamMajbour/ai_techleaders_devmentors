import { defineDomainEntity, p, type InferEntity } from '../define';

export const LoginToken = defineDomainEntity({
  name: 'LoginToken',
  tableName: 'login_tokens',
  properties: {
    email: p.string(),
    tokenHash: p.string().hidden().unique(),
    expiresAt: p.datetime(),
    consumedAt: p.datetime().nullable(),
    reusable: p.boolean(),
  },
});

export type LoginToken = InferEntity<typeof LoginToken>;
