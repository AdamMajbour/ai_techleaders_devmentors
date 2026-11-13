import { defineDomainEntity, p, type InferEntity } from '../define';

export const TermsAcceptance = defineDomainEntity({
  name: 'TermsAcceptance',
  tableName: 'terms_acceptances',
  properties: {
    userId: p.uuid(),
    termsVersionId: p.uuid(),
    sha256: p.string(),
    kind: p.string(),
    acceptedAt: p.datetime(),
    subjectType: p.string().nullable(),
    subjectId: p.uuid().nullable(),
  },
});

export type TermsAcceptance = InferEntity<typeof TermsAcceptance>;
