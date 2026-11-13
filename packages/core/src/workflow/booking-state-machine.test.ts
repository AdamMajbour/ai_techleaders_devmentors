import { bookingStateMachine } from './booking-state-machine';

describe('booking state machine', () => {
  it('allows payment outcomes only from pending_payment for server reconciliation or webhooks', () => {
    expect(bookingStateMachine.can('pending_payment', 'markPaid', 'webhook')).toBe(true);
    expect(bookingStateMachine.can('pending_payment', 'markPaymentFailed', 'server')).toBe(true);
    expect(bookingStateMachine.can('pending_payment', 'markPaid', 'mentor')).toBe(false);
    expect(bookingStateMachine.can('paid', 'markPaid', 'webhook')).toBe(false);
  });

  it('allows only the mentor to accept or decline a paid booking', () => {
    expect(bookingStateMachine.can('paid', 'accept', 'mentor')).toBe(true);
    expect(bookingStateMachine.can('paid', 'decline', 'mentor')).toBe(true);
    expect(bookingStateMachine.can('paid', 'accept', 'operator')).toBe(false);
    expect(bookingStateMachine.can('pending_payment', 'decline', 'mentor')).toBe(false);
  });

  it('allows server/operator expiry from paid and keeps accepted bookings terminal', () => {
    expect(bookingStateMachine.can('paid', 'expire', 'server')).toBe(true);
    expect(bookingStateMachine.can('paid', 'expire', 'operator')).toBe(true);
    expect(bookingStateMachine.allowedActions('accepted', 'mentor')).toEqual([]);
    expect(bookingStateMachine.allowedActions('declined', 'mentor')).toEqual([]);
    expect(bookingStateMachine.allowedActions('expired', 'operator')).toEqual([]);
  });
});
