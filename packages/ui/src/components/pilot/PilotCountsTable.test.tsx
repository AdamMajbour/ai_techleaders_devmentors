import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PilotCountsTable, pilotTriggerLabel, type PilotCountRow, type PilotTrigger } from './PilotCountsTable';

const rows: (PilotCountRow & { trigger: PilotTrigger })[] = [
  { id: 'prepaid', criterion: 'People who prepaid a 25-minute session', value: '3 people', threshold: 'fewer than 5 people within 4 weeks', reviewDate: '2026-11-30', trigger: 'open' },
  { id: 'reply', criterion: 'Median reply to a paid question', value: '74 min', threshold: 'longer than 60 minutes', reviewDate: '2026-11-30', trigger: 'triggered' },
  { id: 'vault', criterion: 'People who paid for a released vault answer', value: '4 people', threshold: 'fewer than 3 people within 4 weeks', reviewDate: '2026-12-14', trigger: 'clear' },
];

describe('PilotCountsTable', () => {
  it('is a table with a column header for every column and one row per criterion', () => {
    render(<PilotCountsTable rows={rows} timeZone="UTC" />);
    const table = screen.getByRole('table', { name: /Pilot criteria/ });
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Criterion', 'Value', 'Provisional threshold', 'Review', 'Status']);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('shows the value next to the condition of the decision record, with the review date', () => {
    render(<PilotCountsTable rows={rows} timeZone="UTC" />);
    const row = screen.getAllByRole('row')[2];
    expect(row).toHaveTextContent('74 min');
    expect(row).toHaveTextContent('longer than 60 minutes');
    expect(row).toHaveTextContent('30 Nov 2026');
  });

  it('right-aligns the values in tabular figures', () => {
    render(<PilotCountsTable rows={rows} timeZone="UTC" />);
    expect(screen.getByText('3 people')).toHaveClass('text-right', 'tabular-nums');
  });

  it.each<[PilotTrigger, string]>([
    ['open', 'Window still open'],
    ['triggered', 'Stop-or-revise condition met'],
    ['clear', 'Condition not met'],
  ])('says the state %s in words', (trigger, text) => {
    expect(pilotTriggerLabel(trigger).text).toBe(text);
    render(<PilotCountsTable rows={[{ ...rows[0], trigger }]} timeZone="UTC" />);
    expect(screen.getByText(text)).toBeVisible();
  });

  it('marks only the met condition as danger', () => {
    render(<PilotCountsTable rows={rows} timeZone="UTC" />);
    expect(screen.getByText('Stop-or-revise condition met')).toHaveAttribute('data-tone', 'danger');
    expect(screen.getByText('Condition not met')).toHaveAttribute('data-tone', 'neutral');
  });

  it('states what is counted and that the thresholds are provisional', () => {
    render(<PilotCountsTable rows={rows} timeZone="UTC" />);
    expect(screen.getByText(/live payments only\. Test payments are not counted\. A vault answer counts when it is released\./)).toBeVisible();
    expect(screen.getByText('The thresholds are provisional targets with no baseline.')).toBeVisible();
  });

  it('says when the numbers were computed, when it is known', () => {
    const { rerender } = render(<PilotCountsTable rows={rows} asOf="2026-11-30T09:15:00Z" timeZone="UTC" />);
    expect(screen.getByText('Counted on 30 Nov 2026 at 09:15.')).toBeVisible();
    rerender(<PilotCountsTable rows={rows} timeZone="UTC" />);
    expect(screen.queryByText(/Counted on/)).not.toBeInTheDocument();
  });

  it('shows an empty state without a table', () => {
    render(<PilotCountsTable rows={[]} />);
    expect(screen.getByText('No criteria to show')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows loading as a busy region with no numbers', () => {
    const { container } = render(<PilotCountsTable rows={rows} status="loading" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error with a retry and no numbers', async () => {
    const onRetry = jest.fn();
    render(<PilotCountsTable rows={rows} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
