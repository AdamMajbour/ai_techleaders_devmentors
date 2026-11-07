import { defineStateMachine } from './state-machine';

const bookingMachine = defineStateMachine({
  states: ['pending_payment', 'paid', 'accepted', 'declined'],
  transitions: {
    pay: { from: ['pending_payment'], to: 'paid', actors: ['seeker'] },
    accept: { from: ['paid'], to: 'accepted', actors: ['mentor'] },
    decline: { from: ['paid'], to: 'declined', actors: ['mentor'] },
  },
});

describe('state machine', () => {
  it('allows an action for a declared source state and actor', () => {
    expect(bookingMachine.can('paid', 'accept', 'mentor')).toBe(true);
  });

  it('rejects actions from an invalid source state and actions by the wrong actor', () => {
    expect(bookingMachine.can('pending_payment', 'accept', 'mentor')).toBe(false);
    expect(bookingMachine.can('paid', 'accept', 'seeker')).toBe(false);
  });

  it('lists only actions permitted for the current state and actor', () => {
    expect(bookingMachine.allowedActions('paid', 'mentor')).toEqual(['accept', 'decline']);
    expect(bookingMachine.allowedActions('paid', 'seeker')).toEqual([]);
    expect(bookingMachine.allowedActions('pending_payment', 'seeker')).toEqual(['pay']);
  });

  it('rejects an undeclared status at runtime', () => {
    expect(bookingMachine.can('unknown' as never, 'pay', 'seeker')).toBe(false);
  });
});
