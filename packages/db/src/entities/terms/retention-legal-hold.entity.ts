import { defineDomainEntity, p, type InferEntity } from '../define';

export const RetentionLegalHold = defineDomainEntity({
  name: 'RetentionLegalHold',
  tableName: 'retention_legal_holds',
  properties: {
    contentType: p.string(),
    contentId: p.uuid(),
    reason: p.string(),
    createdBy: p.uuid(),
  },
});

export type RetentionLegalHold = InferEntity<typeof RetentionLegalHold>;
