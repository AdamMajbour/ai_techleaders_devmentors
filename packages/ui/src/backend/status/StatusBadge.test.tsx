import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

const labels = {
  awaiting_payment: { text: 'Awaiting payment', tone: 'neutral' },
  awaiting_decision: { text: 'Awaiting your decision', tone: 'active' },
  declined: { text: 'Declined', tone: 'danger' },
} as const;

describe('backend StatusBadge', () => {
  it.each([
    ['awaiting_payment', 'Awaiting payment', 'neutral', 'bg-muted'],
    ['awaiting_decision', 'Awaiting your decision', 'active', 'bg-primary'],
    ['declined', 'Declined', 'danger', 'border-destructive'],
  ] as const)('maps %s to its text and tone', (status, text, tone, expectedClass) => {
    render(<StatusBadge status={status} labels={labels} />);

    const badge = screen.getByText(text);
    expect(badge).toBeVisible();
    expect(badge).toHaveAttribute('data-status', status);
    expect(badge).toHaveAttribute('data-tone', tone);
    expect(badge).toHaveClass(expectedClass);
  });

  it('uses the status text with a neutral tone when there is no label', () => {
    render(<StatusBadge status="pending_review" labels={labels} />);

    const badge = screen.getByText('pending_review');
    expect(badge).toBeVisible();
    expect(badge).toHaveAttribute('data-tone', 'neutral');
  });

  it('does not render a blank label when a configured text is empty', () => {
    render(<StatusBadge status="declined" labels={{ declined: { text: '', tone: 'danger' } }} />);

    expect(screen.getByText('declined')).toBeVisible();
  });
});
