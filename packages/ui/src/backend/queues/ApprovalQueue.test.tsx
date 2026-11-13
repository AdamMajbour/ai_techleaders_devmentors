import { fireEvent, render, screen } from '@testing-library/react';
import { ApprovalQueue } from './ApprovalQueue';

describe('ApprovalQueue', () => {
  const props = {
    items: ['answer-1'],
    renderItem: (item: string) => <li key={item}>{item}</li>,
    emptyTitle: 'Nothing to review',
    emptyDescription: 'New approvals appear here.',
    errorMessage: 'The queue could not be loaded.',
    loadingMessage: 'Loading approvals…',
    onRetry: jest.fn(),
  };

  it('renders loading, error with retry, empty and ready states', () => {
    const { rerender } = render(<ApprovalQueue {...props} state="loading" />);
    expect(screen.getByText('Loading approvals…')).toBeInTheDocument();
    rerender(<ApprovalQueue {...props} state="error" />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    rerender(<ApprovalQueue {...props} state="empty" />);
    expect(screen.getByText('Nothing to review')).toBeInTheDocument();
    rerender(<ApprovalQueue {...props} state="ready" />);
    expect(screen.getByRole('listitem')).toHaveTextContent('answer-1');
  });
});
