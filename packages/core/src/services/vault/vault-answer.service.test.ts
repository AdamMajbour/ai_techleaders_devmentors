import type { EventBus } from '../../events/event-bus';
import type { Logger } from '../../logger';
import type { PaymentGateway } from '../payments/payment-gateway.port';
import { VaultAnswerService } from './vault-answer.service';

const seekerId = '10000000-0000-4000-8000-000000000001';
const answerId = '20000000-0000-4000-8000-000000000001';
const terms = { acceptedTerms: true as const, termsVersionId: '00000000-0000-4000-8000-000000000001', termsSha256: 'a'.repeat(64) };

function setup(options: {
  notes?: Array<{ id: string; title: string; mentorId: string; mentorName: string; body: string }>;
  openCount?: number;
  ready?: boolean;
  enabled?: boolean;
} = {}) {
  const now = new Date('2026-11-10T12:00:00.000Z');
  const answer = {
    id: answerId,
    seekerId,
    question: 'How do I improve this query?',
    status: 'pending_payment',
    priceMinor: 1000,
    currency: 'EUR',
    answerText: null,
    failureReason: null,
    modelId: null,
    inputTokens: null,
    outputTokens: null,
    generationAttempts: 0,
    generationStartedAt: null,
    previewRequired: true,
    reviewExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const createWithPayment = jest.fn().mockResolvedValue({ answer, payment: {} });
  const failCheckout = jest.fn();
  const countOpenForSeeker = jest.fn().mockResolvedValue(options.openCount ?? 0);
  const paymentRepository = { setProviderSessionForVaultAnswer: jest.fn().mockImplementation(async (_id: string, providerSessionId: string) => ({ providerSessionId })), findByVaultAnswerId: jest.fn() };
  const createCheckout = jest.fn().mockResolvedValue({ providerSessionId: 'checkout-1', url: 'https://pay.example.test/session' });
  const emit = jest.fn();
  const assertAIReady = jest.fn(() => { if (options.ready === false) throw new Error('disabled'); });
  const service = new VaultAnswerService({
    vaultAnswerRepository: { createWithPayment, failCheckout, countOpenForSeeker, findById: jest.fn(), findForSeeker: jest.fn(), findCitations: jest.fn().mockResolvedValue([]), findReviewFor: jest.fn() },
    paymentRepository,
    noteSelector: { selectFor: jest.fn().mockResolvedValue(options.notes ?? [{
      id: '30000000-0000-4000-8000-000000000001',
      title: 'Database indexes',
      mentorId: '40000000-0000-4000-8000-000000000001',
      mentorName: 'Mentor',
      body: 'Index the columns used by the query.',
    }]) },
    invitationService: { isPilotMember: jest.fn().mockResolvedValue(true), isAcceptedSeeker: jest.fn().mockResolvedValue(true), isAcceptedMentor: jest.fn().mockResolvedValue(true) },
    paymentGateway: { provider: 'mock', createCheckout, getCheckout: jest.fn(), refund: jest.fn() } as unknown as PaymentGateway,
    paymentService: { handleEvent: jest.fn() },
    eventBus: { emit } as unknown as EventBus,
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as Logger,
    clock: { now: () => now },
    vaultSettings: () => ({ enabled: options.enabled ?? true, publishEnabled: true, isProduction: false }),
    assertAIReady,
  });
  return { service, createWithPayment, createCheckout, failCheckout, countOpenForSeeker, emit, assertAIReady, paymentRepository };
}

describe('VaultAnswerService.create', () => {
  it('uses server price and creates a subject-specific checkout after preflight', async () => {
    const deps = setup();
    const result = await deps.service.create({ userId: seekerId }, {
      question: '  How do I improve this query?  ', ...terms,
      priceMinor: 1,
    });

    expect(result.checkoutUrl).toBe('https://pay.example.test/session');
    expect(result.answer).toMatchObject({ status: 'pending_payment', priceMinor: 1000, currency: 'EUR' });
    expect(result.answer).not.toHaveProperty('answerText');
    expect(deps.createWithPayment).toHaveBeenCalledWith(expect.objectContaining({
      seekerId,
      question: 'How do I improve this query?',
      priceMinor: 1000,
    }), expect.objectContaining({ amountMinor: 1000, currency: 'EUR' }));
    expect(deps.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
      subjectType: 'vault_answer', subjectId: answerId, amountMinor: 1000,
    }));
    expect(deps.paymentRepository.setProviderSessionForVaultAnswer).toHaveBeenCalledWith(answerId, 'checkout-1');
    expect(deps.emit).toHaveBeenCalledWith('vault.answer.created', { answerId, seekerId });
  });

  it('does not charge when there are no notes or AI is not configured', async () => {
    const noNotes = setup({ notes: [] });
    await expect(noNotes.service.create({ userId: seekerId }, { question: 'Question?', ...terms })).rejects.toThrow(/no mentor notes/i);
    expect(noNotes.createWithPayment).not.toHaveBeenCalled();

    const noAI = setup({ ready: false });
    await expect(noAI.service.create({ userId: seekerId }, { question: 'Question?', ...terms })).rejects.toMatchObject({ status: 503 });
    expect(noAI.createWithPayment).not.toHaveBeenCalled();
  });

  it('keeps abandoned pending payments outside the open-answer cap and fails closed when vault is disabled', async () => {
    const atLimit = setup({ openCount: 3 });
    await expect(atLimit.service.create({ userId: seekerId }, { question: 'Question?', ...terms })).rejects.toMatchObject({ status: 429 });
    expect(atLimit.createWithPayment).not.toHaveBeenCalled();
    const disabled = setup({ enabled: false });
    await expect(disabled.service.create({ userId: seekerId }, { question: 'Question?', ...terms })).rejects.toMatchObject({ status: 404 });
  });

  it('marks the answer and payment failed when checkout creation fails', async () => {
    const deps = setup();
    deps.createCheckout.mockRejectedValue(new Error('provider details'));
    await expect(deps.service.create({ userId: seekerId }, { question: 'Question?', ...terms })).rejects.toMatchObject({ status: 503 });
    expect(deps.failCheckout).toHaveBeenCalledWith(answerId);
  });
});
