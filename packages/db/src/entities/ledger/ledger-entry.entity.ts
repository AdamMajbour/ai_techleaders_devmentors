import { defineDomainEntity, p, type InferEntity } from '../define';

export const LedgerEntry = defineDomainEntity({
  name: 'LedgerEntry',
  tableName: 'ledger_entries',
  properties: {
    accountId: p.uuid(),
    amountMinor: p.integer(),
    currency: p.string(),
    livemode: p.boolean(),
    sourceType: p.string(),
    sourceId: p.uuid(),
  },
});

export type LedgerEntry = InferEntity<typeof LedgerEntry>;
