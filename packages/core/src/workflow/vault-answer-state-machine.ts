import { defineStateMachine } from './state-machine';

export const vaultAnswerStateMachine = defineStateMachine({
  states: [
    'pending_payment', 'payment_failed', 'paid', 'generating', 'generation_failed',
    'pending_preview', 'rejected', 'expired', 'cancelled', 'released',
  ],
  transitions: {
    confirmPayment: { from: ['pending_payment'], to: 'paid', actors: ['webhook', 'system'] },
    failPayment: { from: ['pending_payment'], to: 'payment_failed', actors: ['webhook', 'system'] },
    startGeneration: { from: ['paid'], to: 'generating', actors: ['system'] },
    finishPreview: { from: ['generating'], to: 'pending_preview', actors: ['system'] },
    finishRelease: { from: ['generating'], to: 'released', actors: ['system'] },
    failGeneration: { from: ['generating'], to: 'generation_failed', actors: ['system'] },
    approve: { from: ['pending_preview'], to: 'released', actors: ['system'] },
    reject: { from: ['pending_preview'], to: 'rejected', actors: ['system'] },
    expire: { from: ['pending_preview'], to: 'expired', actors: ['system'] },
    cancel: { from: ['paid', 'generating', 'pending_preview'], to: 'cancelled', actors: ['operator'] },
  },
  public: ['id', 'status', 'priceMinor', 'currency', 'createdAt', 'updatedAt', 'allowedActions', 'citations'],
  fields: {
    question: { visibleTo: { seeker: '*', assignee: ['pending_preview'], operator: '*' } },
    canDecide: { visibleTo: { assignee: ['pending_preview'] } },
    reviewExpiresAt: { visibleTo: { assignee: ['pending_preview'] } },
    ownNoteTitle: { visibleTo: { assignee: ['pending_preview'] } },
    otherMentors: { visibleTo: { assignee: ['pending_preview'] } },
    answerText: { visibleTo: { seeker: ['released'], assignee: ['pending_preview'], operator: '*' } },
    failureReason: { visibleTo: { seeker: ['generation_failed'], operator: '*' } },
    previewRequired: { visibleTo: { operator: '*' } },
    modelId: { visibleTo: { operator: '*' } },
    inputTokens: { visibleTo: { operator: '*' } },
    outputTokens: { visibleTo: { operator: '*' } },
    refundStatus: { visibleTo: { seeker: '*' } },
  },
});
