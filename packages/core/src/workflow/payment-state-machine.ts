import { defineStateMachine } from './state-machine';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refund_pending' | 'refunded';

export const paymentStateMachine = defineStateMachine({
  states: ['pending', 'succeeded', 'failed', 'refund_pending', 'refunded'],
  transitions: {
    markSucceeded: {
      from: ['pending'],
      to: 'succeeded',
      actors: ['server', 'webhook'],
    },
    markFailed: {
      from: ['pending'],
      to: 'failed',
      actors: ['server', 'webhook'],
    },
    requestRefund: {
      from: ['succeeded'],
      to: 'refund_pending',
      actors: ['operator', 'system'],
    },
    markRefunded: {
      from: ['refund_pending'],
      to: 'refunded',
      actors: ['server', 'webhook'],
    },
  },
});

export type PaymentActor = 'server' | 'webhook' | 'operator' | 'system';
