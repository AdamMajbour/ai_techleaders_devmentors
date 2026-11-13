import { defineDomainEntity, p, type InferEntity } from '../define';
export const Booking = defineDomainEntity({ name: 'Booking', tableName: 'bookings', properties: { status: p.string(), mentorId: p.uuid().index(), seekerId: p.uuid().index() } });
export type Booking = InferEntity<typeof Booking>;
