import type { LedgerEntryRepository, NewLedgerEntry } from '@devmentor/db';
import { ConflictError } from '../../http/errors';

type Dependencies = { ledgerEntryRepository: Pick<LedgerEntryRepository, 'record' | 'balanceOf' | 'findByAccount'> };

export interface LedgerEntryDto {
  id: string;
  amountMinor: number;
  currency: string;
  livemode: boolean;
  sourceType: string;
  sourceId: string;
  createdAt: string;
}

export class LedgerService {
  constructor(private readonly dependencies: Dependencies) {}

  async record(entries: readonly NewLedgerEntry[]): Promise<number> {
    try {
      return await this.dependencies.ledgerEntryRepository.record(entries);
    } catch (error) {
      if (error instanceof Error && error.name === 'StatusTransitionConflictError') {
        throw new ConflictError(error.message);
      }
      throw error;
    }
  }

  async balances(accountId: string): Promise<{ balanceMinor: number; testBalanceMinor: number }> {
    const [balanceMinor, testBalanceMinor] = await Promise.all([
      this.dependencies.ledgerEntryRepository.balanceOf(accountId, true),
      this.dependencies.ledgerEntryRepository.balanceOf(accountId, false),
    ]);
    return { balanceMinor, testBalanceMinor };
  }

  async entriesFor(accountId: string): Promise<LedgerEntryDto[]> {
    const entries = await this.dependencies.ledgerEntryRepository.findByAccount(accountId);
    return entries.map((entry) => ({
      id: entry.id,
      amountMinor: entry.amountMinor,
      currency: entry.currency,
      livemode: entry.livemode,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      createdAt: new Date(entry.createdAt).toISOString(),
    }));
  }
}
