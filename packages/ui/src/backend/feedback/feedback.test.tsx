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
