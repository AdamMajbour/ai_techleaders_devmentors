import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  it('returns live and test balances separately', async () => {
    const balanceOf = jest.fn(async (_accountId: string, livemode: boolean) => livemode ? 800 : 120);
    const service = new LedgerService({
      ledgerEntryRepository: { record: jest.fn(), balanceOf, findByAccount: jest.fn() },
    });
    await expect(service.balances('mentor-1')).resolves.toEqual({ balanceMinor: 800, testBalanceMinor: 120 });
  });

  it('delegates idempotent credit recording to the repository', async () => {
    const record = jest.fn().mockResolvedValue(1);
    const service = new LedgerService({
      ledgerEntryRepository: { record, balanceOf: jest.fn(), findByAccount: jest.fn() },
    });
    const entries = [{
      accountId: 'mentor-1', amountMinor: 267, currency: 'EUR', livemode: true,
      sourceType: 'vault_answer', sourceId: 'answer-1',
    }];
    await expect(service.record(entries)).resolves.toBe(1);
    expect(record).toHaveBeenCalledWith(entries);
  });
});
