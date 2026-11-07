import { paymentStateMachine } from './payment-state-machine';

describe('payment state machine', () => {
  it('allows pending payment outcomes from server reconciliation or webhooks', () => {
    expect(paymentStateMachine.can('pending', 'markSucceeded', 'webhook')).toBe(true);
    expect(paymentStateMachine.can('pending', 'markFailed', 'server')).toBe(true);
    expect(paymentStateMachine.can('pending', 'markSucceeded', 'operator')).toBe(false);
    expect(paymentStateMachine.can('succeeded', 'markFailed', 'webhook')).toBe(false);
  });

  it('requires an operator or system action to start a refund', () => {
    expect(paymentStateMachine.can('succeeded', 'requestRefund', 'operator')).toBe(true);
    expect(paymentStateMachine.can('succeeded', 'requestRefund', 'system')).toBe(true);
    expect(paymentStateMachine.can('succeeded', 'requestRefund', 'webhook')).toBe(false);
  });

  it('allows refund completion only after a refund is pending and has no terminal actions', () => {
    expect(paymentStateMachine.can('refund_pending', 'markRefunded', 'server')).toBe(true);
    expect(paymentStateMachine.can('succeeded', 'markRefunded', 'webhook')).toBe(false);
    expect(paymentStateMachine.allowedActions('refunded', 'operator')).toEqual([]);
    expect(paymentStateMachine.allowedActions('failed', 'server')).toEqual([]);
  });
});
