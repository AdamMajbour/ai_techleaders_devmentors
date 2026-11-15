import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditsPanel, type CreditEntry } from './CreditsPanel';

const entries: CreditEntry[] = [
  { id: 'c1', date: '2026-11-03T14:00:00Z', amountMinor: 400, livemode: true },
  { id: 'c2', date: '2026-11-04T09:00:00Z', amountMinor: 267, livemode: true },
  { id: 'c3', date: '2026-11-05T09:00:00Z', amountMinor: 400, livemode: false },
];

describe('CreditsPanel', () => {
  it('shows the balance with two decimals and says nothing is paid out yet', () => {
    render(<CreditsPanel balanceMinor={667} currency="PLN" entries={entries} timeZone="UTC" />);
    expect(screen.getByText('6.67 PLN')).toHaveClass('tabular-nums');
    expect(screen.getByText('Not paid out yet. Payout is arranged separately.')).toBeVisible();
  });

  it('lists entries in a table with column headers and right-aligned amounts', () => {
    render(<CreditsPanel balanceMinor={667} currency="PLN" entries={entries} timeZone="UTC" />);
    const table = screen.getByRole('table', { name: 'Credits by answer' });
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Date', 'Type', 'Amount']);
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('3 Nov 2026');
    expect(rows[1]).toHaveTextContent('4.00 PLN');
  });

  it('marks test credits in words and keeps them out of the balance', () => {
    render(<CreditsPanel balanceMinor={667} testBalanceMinor={400} currency="PLN" entries={entries} timeZone="UTC" />);
    expect(screen.getByText('Test credit')).toBeVisible();
    expect(screen.getByText(/Test credits, not counted:/)).toHaveTextContent('4.00 PLN');
    expect(screen.getByText('6.67 PLN')).toBeVisible();
  });

  it('shows no test line when there are no test credits', () => {
    render(<CreditsPanel balanceMinor={0} currency="PLN" entries={[]} />);
    expect(screen.queryByText(/Test credits/)).not.toBeInTheDocument();
  });

  it('shows an empty state that says how credits are earned', () => {
    render(<CreditsPanel balanceMinor={0} currency="PLN" entries={[]} />);
    expect(screen.getByText('No credits yet')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows loading as a busy region and no balance', () => {
    const { container } = render(<CreditsPanel balanceMinor={0} currency="PLN" entries={[]} status="loading" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText(/Balance/)).not.toBeInTheDocument();
  });

  it('shows an error with a retry and no balance', async () => {
    const onRetry = jest.fn();
    render(<CreditsPanel balanceMinor={0} currency="PLN" entries={[]} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Balance/)).not.toBeInTheDocument();
  });
});
