import type { VaultAnswer } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Logger } from '../../logger';
import type { Clock } from '../../utils/clock';
import { MockAnswerGenerator } from '../ai/adapters/mock-answer-generator';
import { GeneratorError } from '../ai/answer-generator.port';
import { VaultGenerationTask } from './vault-generation.task';

const answerId = '20000000-0000-4000-8000-000000000001';
const mentorId = '40000000-0000-4000-8000-000000000001';
const noteId = '30000000-0000-4000-8000-000000000001';

function answer(overrides: Partial<VaultAnswer> = {}): VaultAnswer {
  const now = new Date('2026-11-10T12:00:00.000Z');
  return {
    id: answerId, seekerId: '10000000-0000-4000-8000-000000000001', question: 'How can I index a database query?',
    status: 'paid', priceMinor: 1000, currency: 'EUR', answerText: null, failureReason: null, modelId: null,
    inputTokens: null, outputTokens: null, generationAttempts: 1, generationStartedAt: now,
    previewRequired: true, reviewExpiresAt: null, createdAt: now, updatedAt: now, ...overrides,
  } as VaultAnswer;
}

function setup(options: { current?: VaultAnswer; generator?: MockAnswerGenerator | { generate: jest.Mock }; persist?: boolean } = {}) {
  const current = options.current ?? answer();
  const now = new Date('2026-11-10T12:00:00.000Z');
  const repository = {
    findForGeneration: jest.fn().mockResolvedValue([current]),
    findById: jest.fn().mockResolvedValue(current),
    claimGeneration: jest.fn().mockResolvedValue(true),
    scheduleGenerationRetry: jest.fn().mockResolvedValue(true),
    failGenerationWithRefund: jest.fn().mockResolvedValue({ changed: true, paymentId: 'payment-1' }),
    persistGenerated: jest.fn().mockResolvedValue(options.persist ?? true),
  };
  const emit = jest.fn();
  const release = jest.fn().mockResolvedValue(true);
  const task = new VaultGenerationTask({
    vaultAnswerRepository: repository as never,
    vaultReleaseService: { release },
    noteSelector: { selectFor: jest.fn().mockResolvedValue([{ id: noteId, title: 'Indexes', mentorId, mentorName: 'Mentor', body: 'Index query columns.' }]) } as never,
    answerGenerator: options.generator ?? new MockAnswerGenerator(),
    eventBus: { emit } as unknown as EventBus,
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as Logger,
    clock: { now: () => now } as Clock,
  });
  return { task, repository, emit, release };
}

describe('VaultGenerationTask', () => {
  it('persists citation and distinct reviewer snapshots before exposing a mentor preview', async () => {
    const deps = setup();
    await expect(deps.task.run({ limit: 5 })).resolves.toEqual({ processed: 1 });
    expect(deps.repository.persistGenerated).toHaveBeenCalledWith(expect.objectContaining({
      answerId, reviewerIds: [mentorId], directRelease: false, reviewExpiresAt: new Date('2026-11-10T14:00:00.000Z'),
      citations: [expect.objectContaining({ noteId, mentorId, mentorName: 'Mentor', noteTitle: 'Indexes', position: 0 })],
    }));
    expect(deps.emit).toHaveBeenCalledWith('vault.answer.generated', { answerId });
    expect(deps.release).not.toHaveBeenCalled();
  });

  it('routes post-preview direct release through the shared credit service', async () => {
    const deps = setup({ current: answer({ previewRequired: false }) });
    await deps.task.run({ limit: 5 });
    expect(deps.repository.persistGenerated).toHaveBeenCalledWith(expect.objectContaining({ directRelease: true, reviewerIds: [] }));
    expect(deps.release).toHaveBeenCalledWith(answerId);
  });

  it('retries invalid model output once and then requests a refund', async () => {
    const invalid = new MockAnswerGenerator();
    const deps = setup({ current: answer({ question: 'Question with [mock:invalid]' }), generator: invalid });
    await deps.task.run({ limit: 5 });
    expect(deps.repository.scheduleGenerationRetry).toHaveBeenCalledWith(answerId, expect.any(Date), 60_000);

    deps.repository.findForGeneration.mockResolvedValue([answer({ question: 'Question with [mock:invalid]', generationAttempts: 2 })]);
    deps.repository.findById.mockResolvedValue(answer({ question: 'Question with [mock:invalid]', generationAttempts: 2 }));
    await deps.task.run({ limit: 5 });
    expect(deps.repository.failGenerationWithRefund).toHaveBeenCalledWith(answerId, 'invalid_output', expect.any(Date));
    expect(deps.emit).toHaveBeenCalledWith('vault.answer.failed', { answerId });
  });

  it('does not call the model when an exhausted stale lease is recovered', async () => {
    const model = { generate: jest.fn() };
    const now = new Date('2026-11-10T12:00:00.000Z');
    const deps = setup({ current: answer({ status: 'generating', generationAttempts: 3, generationStartedAt: new Date(now.getTime() - 181_000) }), generator: model });
    deps.repository.claimGeneration.mockResolvedValue(false);
    await deps.task.run({ limit: 5 });
    expect(model.generate).not.toHaveBeenCalled();
    expect(deps.repository.failGenerationWithRefund).toHaveBeenCalledWith(answerId, 'unavailable', expect.any(Date));
  });

  it('leaves persisted-work failures retryable instead of misclassifying them as model failures', async () => {
    const deps = setup();
    deps.repository.persistGenerated.mockRejectedValue(new Error('database unavailable'));
    await expect(deps.task.run({ limit: 5 })).rejects.toThrow('database unavailable');
    expect(deps.repository.failGenerationWithRefund).not.toHaveBeenCalled();
  });

  it('treats an adapter outage as retryable up to the third model call', async () => {
    const model = { generate: jest.fn().mockRejectedValue(new GeneratorError('unavailable')) };
    const deps = setup({ generator: model });
    await deps.task.run({ limit: 5 });
    expect(deps.repository.scheduleGenerationRetry).toHaveBeenCalledWith(answerId, expect.any(Date), 60_000);
  });
});
