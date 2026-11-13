import { defineDomainEntity, p, type InferEntity } from '../define';

export const Message = defineDomainEntity({
  name: 'Message',
  tableName: 'messages',
  properties: {
    bookingId: p.uuid(),
    authorId: p.uuid(),
    body: p.text(),
  },
});

export type Message = InferEntity<typeof Message>;
