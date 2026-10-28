import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('always shows its text, so the status is not colour alone', () => {
    render(<StatusBadge>Paid</StatusBadge>);
    expect(screen.getByText('Paid')).toBeVisible();
  });

  it('is neutral by default', () => {
    render(<StatusBadge>Paid</StatusBadge>);
    expect(screen.getByText('Paid')).toHaveAttribute('data-tone', 'neutral');
  });

  it.each([
    ['neutral', 'bg-muted'],
    ['active', 'bg-primary'],
    ['danger', 'border-destructive'],
  ] as const)('applies the %s tone', (tone, expected) => {
    render(<StatusBadge tone={tone}>Label</StatusBadge>);
    expect(screen.getByText('Label')).toHaveClass(expected);
  });

  it('renders an icon next to the text', () => {
    render(<StatusBadge icon={<svg data-testid="icon" aria-hidden="true" />}>Declined</StatusBadge>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeVisible();
  });
});
