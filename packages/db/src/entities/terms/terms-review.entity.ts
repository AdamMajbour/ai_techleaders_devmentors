import { defineDomainEntity, p, type InferEntity } from '../define';

export const TermsReview = defineDomainEntity({
  name: 'TermsReview',
  tableName: 'terms_reviews',
  properties: {
    termsVersionId: p.uuid(),
    sha256: p.string(),
    reviewer: p.string(),
    scopes: p.json(),
    outcome: p.string(),
    reviewedAt: p.datetime(),
    note: p.string().nullable(),
    recordedBy: p.uuid(),
  },
});

export type TermsReview = InferEntity<typeof TermsReview>;
