import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { LoadingMessage } from './LoadingMessage';

describe('feedback components', () => {
  it('LoadingMessage is a polite status with a default and a custom text', () => {
    const { rerender } = render(<LoadingMessage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');

    rerender(<LoadingMessage message="Fetching articles" />);
    expect(screen.getByRole('status')).toHaveTextContent('Fetching articles');
  });

  it('ErrorMessage is an alert and offers retry only when given a handler', async () => {
    const onRetry = jest.fn();
    const { rerender } = render(<ErrorMessage message="Boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<ErrorMessage message="Boom" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('EmptyState shows its title, optional description and action', () => {
    render(<EmptyState title="No reviews" description="Be the first" action={<button>Write</button>} />);

    expect(screen.getByText('No reviews')).toBeInTheDocument();
    expect(screen.getByText('Be the first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write' })).toBeInTheDocument();
  });
});

describe('feedback components, states and wording', () => {
  it('EmptyState can offer the next step as a link or a button', async () => {
    const onClear = jest.fn();
    render(
      <EmptyState
        title="No mentors for Kubernetes"
        description="Try another technology or clear the filter."
        action={<button onClick={onClear}>Clear filter</button>}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('EmptyState has no illustration or icon, the words are the content (A01)', () => {
    const { container } = render(<EmptyState title="No questions yet" />);
    expect(container.querySelector('svg, img')).toBeNull();
  });

  it('ErrorMessage shows an icon next to the words, hidden from assistive technology', () => {
    const { container } = render(<ErrorMessage message="Questions could not be loaded. Try again." />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Questions could not be loaded. Try again.');
  });

  it('ErrorMessage retries when asked, and the button is reachable by keyboard', async () => {
    const onRetry = jest.fn();
    render(<ErrorMessage message="Boom" onRetry={onRetry} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('LoadingMessage uses the muted token text colour', () => {
    render(<LoadingMessage />);
    expect(screen.getByRole('status')).toHaveClass('text-muted-foreground');
  });
});

