import { render } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology: the loading state is announced as text elsewhere', () => {
    const { container } = render(<Skeleton className="h-4 w-48" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not animate: an endless pulse is decorative motion (A01, WCAG 2.2.2)', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className).not.toMatch(/animate-/);
  });

  it('uses the muted surface token and merges a custom size', () => {
    const { container } = render(<Skeleton className="h-4 w-48" />);
    expect(container.firstElementChild).toHaveClass('bg-muted', 'h-4', 'w-48');
  });
});
