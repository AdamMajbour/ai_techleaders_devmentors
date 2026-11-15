import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewItem, type ReviewItemData } from './ReviewItem';

const item: ReviewItemData = {
  answerId: 'a1',
  question: 'How do I debug a restart loop after an ingress upgrade?',
  answerText: 'Read the **previous** logs first.',
  ownNoteTitle: 'Ingress upgrades on bare metal',
  otherMentors: ['Jan Nowak'],
  expiresAt: '2026-11-03T15:00:00Z',
};

function renderItem(props: Partial<React.ComponentProps<typeof ReviewItem>> = {}) {
  return render(
    <ul>
      <ReviewItem item={item} now="2026-11-03T13:40:00Z" timeZone="UTC" onApprove={jest.fn()} onReject={jest.fn()} {...props} />
    </ul>,
  );
}

describe('ReviewItem', () => {
  it('shows the question, the whole answer, which note is theirs and who else is cited', () => {
    renderItem();
    expect(screen.getByText(item.question)).toBeVisible();
    expect(screen.getByText('previous')).toBeVisible();
    expect(screen.getByText(/Ingress upgrades on bare metal\./)).toBeVisible();
    expect(screen.getByText(/Also cited: Jan Nowak\./)).toBeVisible();
  });

  it('says so when no other mentor is cited', () => {
    renderItem({ item: { ...item, otherMentors: [] } });
    expect(screen.getByText(/No other mentor is cited\./)).toBeVisible();
  });

  it('states the deadline as a time and as time left, from the server time', () => {
    renderItem();
    expect(screen.getByText('Decide by 15:00 (1 h 20 min left).')).toBeVisible();
  });

  it('shows no seeker name', () => {
    renderItem();
    expect(screen.getByText('Question from a seeker')).toBeVisible();
  });

  it('approves with the answer id', async () => {
    const onApprove = jest.fn();
    renderItem({ onApprove });
    await userEvent.click(screen.getByRole('button', { name: /^Approve/ }));
    expect(onApprove).toHaveBeenCalledWith('a1');
  });

  it('rejects with the trimmed reason, or none', async () => {
    const onReject = jest.fn();
    renderItem({ onReject });
    await userEvent.click(screen.getByRole('button', { name: /^Reject/ }));
    expect(onReject).toHaveBeenLastCalledWith('a1', undefined);
    await userEvent.type(screen.getByLabelText(/Reason/), '  Not what I wrote  ');
    await userEvent.click(screen.getByRole('button', { name: /^Reject/ }));
    expect(onReject).toHaveBeenLastCalledWith('a1', 'Not what I wrote');
  });

  it('says who reads the reason and that one rejection rejects the whole answer', () => {
    renderItem();
    expect(screen.getByLabelText(/Reason/)).toHaveAccessibleDescription(/Only the operator reads the reason.*the whole answer is rejected/);
  });

  it('blocks both buttons while one action runs and says which', () => {
    renderItem({ pendingAction: 'approve' });
    expect(screen.getByRole('button', { name: /^Approving…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Reject/ })).toBeDisabled();
  });

  it('shows why an action failed, as an alert', () => {
    renderItem({ actionError: 'This answer already expired.' });
    expect(screen.getByRole('alert')).toHaveTextContent('This answer already expired.');
  });

  it('replaces the buttons by a sentence once decided', () => {
    renderItem({ decision: 'approved' });
    expect(screen.getByText(/You approved this answer/)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('closes the window at the deadline and offers no action', () => {
    renderItem({ now: '2026-11-03T15:00:00Z' });
    expect(screen.getByText(/The time to decide has passed/)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('never renders a link inside the generated answer', () => {
    renderItem({ item: { ...item, answerText: 'See [docs](https://evil.example).' } });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('has a heading level that fits under the heading of the list', () => {
    renderItem({ headingLevel: 2 });
    expect(screen.getByRole('heading', { level: 2, name: 'Generated answer' })).toBeVisible();
  });
});
