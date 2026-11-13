import { defineDomainEntity, p, type InferEntity } from '../define';

export const AvailabilitySlot = defineDomainEntity({
  name: 'AvailabilitySlot',
  tableName: 'mentor_availability_slots',
  properties: {
    mentorId: p.uuid(),
    startsAt: p.datetime(),
    endsAt: p.datetime(),
    status: p.string(),
    bookingId: p.uuid().nullable(),
  },
});

export type AvailabilitySlot = InferEntity<typeof AvailabilitySlot>;
