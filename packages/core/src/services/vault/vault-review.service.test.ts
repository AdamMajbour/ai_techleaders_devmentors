import type { EventBus } from '../../events/event-bus';
import type { Session } from '../../security/session';
import type { VaultAnswer } from '@devmentor/db';
import { VaultReviewService } from './vault-review.service';

const answerId = '20000000-0000-4000-8000-000000000001';
const mentorId = '40000000-0000-4000-8000-000000000001';
const noteId = '30000000-0000-4000-8000-000000000001';

function answer(overrides: Partial<VaultAnswer> = {}): VaultAnswer {
  const now = new Date('2026-11-10T12:00:00.000Z');
  return {
    id: answerId, seekerId: '10000000-0000-4000-8000-000000000001', question: 'Question?', status: 'pending_preview',
    priceMinor: 1000, currency: 'PLN', answerText: 'An answer.', failureReason: null, modelId: 'mock-v1',
    inputTokens: 10, outputTokens: 5, generationAttempts: 1, generationStartedAt: now, previewRequired: true,
    reviewExpiresAt: new Date('2026-11-10T14:00:00.000Z'), createdAt: now, updatedAt: now, ...overrides,
  } as VaultAnswer;
}

function setup(options: { reviewerIds?: string[]; existingDecisions?: Record<string, string | null>; noteStatus?: string } = {}) {
  const currentAnswer = answer();
  const reviewerIds = options.reviewerIds ?? [mentorId];
  const decisions = new Map(reviewerIds.map((id) => [id, options.existingDecisions?.[id] ?? null]));
  const reviews = () => [...decisions].map(([reviewerId, decision]) => ({ answerId, reviewerId, decision }));
  const citations = [{ answerId, noteId, mentorId, mentorName: 'Mentor', noteTitle: 'Indexes', position: 0 }];
  const findById = jest.fn(async () => currentAnswer);
  const decideAndReleaseWithCredits = jest.fn(async () => {
    currentAnswer.status = 'released';
    return true;
  });
  const decideReviewAndTransition = jest.fn(async (input: { reviewerId: string; decision: 'approved' | 'rejected' }) => {
    decisions.set(input.reviewerId, input.decision);
    if (input.decision === 'rejected') currentAnswer.status = 'rejected';
    return { changed: true, reviews: reviews() as never[] };
  });
  const emit = jest.fn();
  const service = new VaultReviewService({
    vaultAnswerRepository: {
      findById, findPreviewsForMentor: jest.fn(), findReviewFor: jest.fn(async (_id: string, reviewerId: string) =>
        decisions.has(reviewerId) ? { answerId, reviewerId, decision: decisions.get(reviewerId) ?? null } as never : null),
      findReviews: jest.fn(async () => reviews() as never[]), findCitations: jest.fn().mockResolvedValue(citations),
      decideReviewAndTransition, decideAndReleaseWithCredits, transitionWithPaymentRefund: jest.fn(), findOperatorAnswers: jest.fn(),
    } as never,
    paymentRepository: { findByVaultAnswerId: jest.fn().mockResolvedValue({ status: 'succeeded', livemode: false }) } as never,
    ledgerEntryRepository: { record: jest.fn() } as never,
    noteRepository: { findById: jest.fn().mockResolvedValue({ id: noteId, status: options.noteStatus ?? 'published' }) } as never,
    vaultReleaseService: { release: jest.fn() },
    unitOfWork: { run: async <T>(work: () => Promise<T>): Promise<T> => work() },
    eventBus: { emit } as unknown as EventBus,
    clock: { now: () => new Date('2026-11-10T12:00:00.000Z') },
  });
  return { service, decideAndReleaseWithCredits, decideReviewAndTransition, emit, currentAnswer };
}

const actor = (userId = mentorId) => ({ userId, role: 'mentor' }) as Session;

describe('VaultReviewService.decide', () => {
  it('releases a single-reviewer answer and credits the full mentor share', async () => {
    const deps = setup();
    await expect(deps.service.decide(actor(), answerId, 'approve')).resolves.toEqual({ id: answerId, status: 'released' });
    expect(deps.decideAndReleaseWithCredits).toHaveBeenCalledWith(expect.objectContaining({
      answerId, reviewerId: mentorId,
      credits: [{ accountId: mentorId, amountMinor: 800, currency: 'PLN', livemode: false, sourceType: 'vault_answer', sourceId: answerId }],
    }));
    expect(deps.emit).toHaveBeenCalledWith('vault.answer.released', { answerId });
  });

  it('rejects the answer and creates no public reason event when a mentor declines', async () => {
    const deps = setup({ reviewerIds: [mentorId, '50000000-0000-4000-8000-000000000001'] });
    await expect(deps.service.decide(actor(), answerId, 'reject', 'private explanation')).resolves.toEqual({ id: answerId, status: 'rejected' });
    expect(deps.decideReviewAndTransition).toHaveBeenCalledWith(expect.objectContaining({ decision: 'rejected', reason: 'private explanation' }));
    expect(deps.emit).toHaveBeenCalledWith('vault.answer.rejected', { answerId });
    expect(JSON.stringify(deps.emit.mock.calls)).not.toContain('private explanation');
  });

  it('converts an approval into a rejection when a cited note is no longer published', async () => {
    const deps = setup({ reviewerIds: [mentorId, '50000000-0000-4000-8000-000000000001'], noteStatus: 'taken_down' });
    await deps.service.decide(actor(), answerId, 'approve');
    expect(deps.decideReviewAndTransition).toHaveBeenCalledWith(expect.objectContaining({ decision: 'rejected' }));
  });

  it('rejects a mentor with no review assignment', async () => {
    const deps = setup();
    await expect(deps.service.decide(actor('60000000-0000-4000-8000-000000000001'), answerId, 'approve')).rejects.toMatchObject({ status: 403 });
  });

  it('does not permit a decision after the server-side review deadline', async () => {
    const deps = setup();
    deps.service = new VaultReviewService({
      vaultAnswerRepository: {
        findById: jest.fn().mockResolvedValue(answer({ reviewExpiresAt: new Date('2026-11-10T11:59:00.000Z') })),
        findReviewFor: jest.fn().mockResolvedValue({ answerId, reviewerId: mentorId, decision: null }),
      } as never,
      paymentRepository: {} as never, ledgerEntryRepository: {} as never, noteRepository: {} as never,
      vaultReleaseService: { release: jest.fn() }, unitOfWork: { run: async <T>(work: () => Promise<T>): Promise<T> => work() },
      eventBus: { emit: jest.fn() } as unknown as EventBus,
      clock: { now: () => new Date('2026-11-10T12:00:00.000Z') },
    });
    await expect(deps.service.decide(actor(), answerId, 'approve')).rejects.toMatchObject({ status: 409 });
  });
});
