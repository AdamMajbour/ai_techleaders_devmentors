import { defineDomainEntity, p, type InferEntity } from '../define';

export const Booking = defineDomainEntity({
  name: 'Booking',
  tableName: 'bookings',
  properties: {
    seekerId: p.uuid(),
    mentorId: p.uuid(),
    question: p.text(),
    durationMinutes: p.integer().default(25),
    priceMinor: p.integer(),
    currency: p.string(),
    status: p.string(),
    source: p.string(),
    landedAt: p.datetime(),
    startsAt: p.datetime().nullable(),
    endsAt: p.datetime().nullable(),
    availabilitySlotId: p.uuid().nullable(),
  },
});

export type Booking = InferEntity<typeof Booking>;
