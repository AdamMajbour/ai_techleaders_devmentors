import type { EventBus } from '../../events/event-bus';
import type { VaultAnswer } from '@devmentor/db';
import { VaultReleaseService } from './vault-release.service';

const answer = {
  id: '20000000-0000-4000-8000-000000000001', seekerId: '10000000-0000-4000-8000-000000000001',
  question: 'Question?', status: 'generating', priceMinor: 1000, currency: 'PLN', answerText: 'Answer',
  failureReason: null, modelId: 'mock-v1', inputTokens: 5, outputTokens: 6, generationAttempts: 1,
  generationStartedAt: new Date('2026-11-10T12:00:00.000Z'), previewRequired: false, reviewExpiresAt: null,
  createdAt: new Date('2026-11-10T12:00:00.000Z'), updatedAt: new Date('2026-11-10T12:00:00.000Z'),
} as VaultAnswer;

function setup(options: { status?: string; release?: { released: boolean; refundRequested: boolean } } = {}) {
  const currentAnswer = { ...answer, status: options.status ?? 'generating' } as VaultAnswer;
  const citations = [
    { answerId: answer.id, noteId: '30000000-0000-4000-8000-000000000001', mentorId: '40000000-0000-4000-8000-000000000001', mentorName: 'One', noteTitle: 'A', position: 0 },
    { answerId: answer.id, noteId: '30000000-0000-4000-8000-000000000002', mentorId: '40000000-0000-4000-8000-000000000002', mentorName: 'Two', noteTitle: 'B', position: 1 },
    { answerId: answer.id, noteId: '30000000-0000-4000-8000-000000000003', mentorId: '40000000-0000-4000-8000-000000000003', mentorName: 'Three', noteTitle: 'C', position: 2 },
  ];
  let committed = false;
  const record = jest.fn().mockImplementation(async () => {
    if (committed) throw new Error('ledger write must occur before transaction commit');
    return 3;
  });
  const emit = jest.fn().mockImplementation(async () => {
    if (!committed) throw new Error('events are emitted only after commit');
  });
  const unitOfWork = { run: async <T>(work: () => Promise<T>): Promise<T> => { const result = await work(); committed = true; return result; } };
  const service = new VaultReleaseService({
    vaultAnswerRepository: { findById: jest.fn().mockResolvedValue(currentAnswer), findCitations: jest.fn().mockResolvedValue(citations), releaseOrRefund: jest.fn().mockResolvedValue(options.release ?? { released: true, refundRequested: false }) } as never,
    paymentRepository: { findByVaultAnswerId: jest.fn().mockResolvedValue({ status: 'succeeded', amountMinor: 1000, currency: 'PLN', livemode: false }) } as never,
    ledgerEntryRepository: { record },
    unitOfWork,
    eventBus: { emit } as unknown as EventBus,
    clock: { now: () => new Date('2026-11-10T12:00:00.000Z') },
  });
  return { service, record, emit };
}

describe('VaultReleaseService', () => {
  it('releases once, credits 80% in citation order, and emits only after the unit of work commits', async () => {
    const deps = setup();
    await expect(deps.service.release(answer.id)).resolves.toBe(true);
    expect(deps.record).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: '40000000-0000-4000-8000-000000000001', amountMinor: 267, sourceType: 'vault_answer', sourceId: answer.id }),
      expect.objectContaining({ accountId: '40000000-0000-4000-8000-000000000002', amountMinor: 267 }),
      expect.objectContaining({ accountId: '40000000-0000-4000-8000-000000000003', amountMinor: 266 }),
    ]);
    expect(deps.emit).toHaveBeenCalledWith('vault.answer.released', { answerId: answer.id });
  });

  it('does not write credits when a cited note has been taken down and reports the refund path', async () => {
    const deps = setup({ release: { released: false, refundRequested: true } });
    await expect(deps.service.release(answer.id)).resolves.toBe(false);
    expect(deps.record).not.toHaveBeenCalled();
    expect(deps.emit).toHaveBeenCalledWith('vault.answer.rejected', { answerId: answer.id });
  });

  it('is idempotent for an already released answer', async () => {
    const deps = setup({ status: 'released' });
    await expect(deps.service.release(answer.id)).resolves.toBe(false);
    expect(deps.record).not.toHaveBeenCalled();
  });
});
