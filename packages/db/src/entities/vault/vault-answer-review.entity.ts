import { defineDomainEntity, p, type InferEntity } from '../define';

export const VaultAnswerReview = defineDomainEntity({
  name: 'VaultAnswerReview',
  tableName: 'vault_answer_reviews',
  properties: {
    answerId: p.uuid(),
    reviewerId: p.uuid(),
    decision: p.string().nullable(),
    decidedAt: p.datetime().nullable(),
    reason: p.string().nullable(),
  },
});

export type VaultAnswerReview = InferEntity<typeof VaultAnswerReview>;
