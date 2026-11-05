import { defineDomainEntity, p, type InferEntity } from '../define';

export const ApprovalRequest = defineDomainEntity({
  name: 'ApprovalRequest',
  tableName: 'approval_requests',
  properties: {
    kind: p.string(),
    subjectType: p.string(),
    subjectId: p.uuid(),
    reason: p.text(),
    status: p.string(),
    decidedBy: p.uuid().nullable(),
    decidedAt: p.datetime().nullable(),
  },
});

export type ApprovalRequest = InferEntity<typeof ApprovalRequest>;
