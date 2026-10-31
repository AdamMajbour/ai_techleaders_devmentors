import { defineDomainEntity, p, type InferEntity } from '../define';

export const StatusTransition = defineDomainEntity({
  name: 'StatusTransition',
  tableName: 'status_transitions',
  properties: {
    entityType: p.string(),
    entityId: p.uuid(),
    fromStatus: p.string(),
    toStatus: p.string(),
    actorKind: p.string(),
    actorUserId: p.uuid().nullable(),
  },
});

export type StatusTransition = InferEntity<typeof StatusTransition>;
