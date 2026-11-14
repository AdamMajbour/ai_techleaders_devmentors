import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingRow, type BookingRowData } from './BookingRow';

const paid: BookingRowData = {
  id: 'b1',
  question: 'Ingress upgrade from 1.9 to 1.28 fails on staging after the admission webhook starts.',
  counterpartName: 'Sam',
  status: 'paid',
  priceMinor: 2500,
  currency: 'PLN',
};

function renderRow(props: Partial<React.ComponentProps<typeof BookingRow>> = {}) {
  return render(
    <ul>
      <BookingRow booking={paid} viewer="mentor" onAccept={jest.fn()} onDecline={jest.fn()} {...props} />
    </ul>,
  );
}

describe('BookingRow', () => {
  it('shows the mentor the whole question next to Accept and Decline (R05)', () => {
    renderRow();
    expect(screen.getByText(/Ingress upgrade from 1.9 to 1.28/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept the question from Sam' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Decline the question from Sam' })).toBeVisible();
  });

  it('calls the handlers with the booking id', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    renderRow({ onAccept, onDecline });
    await userEvent.click(screen.getByRole('button', { name: /^Accept/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Decline/ }));
    expect(onAccept).toHaveBeenCalledWith('b1');
    expect(onDecline).toHaveBeenCalledWith('b1');
  });

  it('shows the actions only to a mentor and only for a paid booking', () => {
    const { rerender } = renderRow({ viewer: 'seeker' });
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
    rerender(
      <ul>
        <BookingRow booking={{ ...paid, status: 'accepted' }} viewer="mentor" onAccept={jest.fn()} onDecline={jest.fn()} />
      </ul>,
    );
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
  });

  it('blocks both buttons while an action runs and says which one', () => {
    renderRow({ pendingAction: 'accept' });
    expect(screen.getByRole('button', { name: /^Accepting…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Decline/ })).toBeDisabled();
  });

  it('says why an action failed, as an alert, and leaves the buttons usable', () => {
    renderRow({ actionError: 'You already have a session at that time. Choose a later start.' });
    expect(screen.getByRole('alert')).toHaveTextContent('You already have a session at that time.');
    expect(screen.getByRole('button', { name: /^Accept/ })).toBeEnabled();
  });

  it('labels the other person by the viewer’s side', () => {
    const { rerender } = renderRow({ viewer: 'seeker' });
    expect(screen.getByText('Mentor')).toBeVisible();
    rerender(
      <ul>
        <BookingRow booking={paid} viewer="mentor" />
      </ul>,
    );
    expect(screen.getByText('Seeker')).toBeVisible();
  });

  it('cuts a long question at three lines and opens it in full through the link', () => {
    renderRow({ href: '/bookings/b1', viewer: 'seeker' });
    expect(screen.getByText(/Ingress upgrade/)).toHaveClass('line-clamp-3');
    expect(screen.getByRole('link', { name: 'Open the session with Sam' })).toHaveAttribute('href', '/bookings/b1');
  });

  it('names the link after the question for a mentor', () => {
    renderRow({ href: '/bookings/b1', viewer: 'mentor' });
    expect(screen.getByRole('link', { name: 'Open the question from Sam' })).toHaveAttribute('href', '/bookings/b1');
  });

  it('shows the status in words and the price', () => {
    renderRow();
    expect(screen.getByText('Awaiting your decision')).toBeVisible();
    expect(screen.getByText('25 PLN')).toHaveClass('tabular-nums');
  });

  it('says the question can no longer be seen when the server left it out', () => {
    renderRow({ booking: { ...paid, status: 'declined', question: undefined } });
    expect(screen.getByText('You can no longer see this question.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
  });
});
