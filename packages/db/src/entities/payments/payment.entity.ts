import { defineDomainEntity, p, type InferEntity } from '../define';

export const Payment = defineDomainEntity({
  name: 'Payment',
  tableName: 'payments',
  properties: {
    bookingId: p.uuid().nullable().unique(),
    vaultAnswerId: p.uuid().nullable().unique(),
    provider: p.string(),
    livemode: p.boolean(),
    providerSessionId: p.string().nullable().unique(),
    providerPaymentId: p.string().nullable(),
    amountMinor: p.integer(),
    currency: p.string(),
    status: p.string(),
  },
});

export type Payment = InferEntity<typeof Payment>;
