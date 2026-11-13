import { defineStateMachine } from './state-machine';

export type BookingStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'paid'
  | 'accepted'
  | 'declined'
  | 'expired';

export const bookingStateMachine = defineStateMachine({
  states: ['pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired'],
  transitions: {
    markPaid: {
      from: ['pending_payment'],
      to: 'paid',
      actors: ['server', 'webhook'],
    },
    markPaymentFailed: {
      from: ['pending_payment'],
      to: 'payment_failed',
      actors: ['server', 'webhook'],
    },
    accept: { from: ['paid'], to: 'accepted', actors: ['mentor'] },
    decline: { from: ['paid'], to: 'declined', actors: ['mentor'] },
    expire: { from: ['paid'], to: 'expired', actors: ['server', 'operator'] },
  },
});

export type BookingActor = 'server' | 'webhook' | 'mentor' | 'operator';
