import { defineDomainEntity, p, type InferEntity } from '../define';

export const TermsVersion = defineDomainEntity({
  name: 'TermsVersion',
  tableName: 'terms_versions',
  properties: {
    kind: p.string(),
    version: p.string(),
    body: p.text(),
    sha256: p.string(),
    status: p.string(),
    publishedAt: p.datetime().nullable(),
    createdBy: p.uuid(),
  },
});

export type TermsVersion = InferEntity<typeof TermsVersion>;
