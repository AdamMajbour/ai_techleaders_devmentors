import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar, type FilterBarProps } from './FilterBar';

const OPTIONS = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'paid', label: 'Waiting for the mentor' },
];

function props(overrides: Partial<FilterBarProps> = {}): FilterBarProps {
  return {
    label: 'Status',
    allLabel: 'All statuses',
    options: OPTIONS,
    value: '',
    onChange: jest.fn(),
    count: 4,
    noun: { one: 'session', many: 'sessions' },
    phrase: (label) => `with status "${label}"`,
    ...overrides,
  };
}

describe('FilterBar', () => {
  it('counts the rows with the noun and shows no chip without a filter', () => {
    render(<FilterBar {...props()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/^4 sessions$/);
    expect(screen.queryByRole('button', { name: /remove filter/ })).not.toBeInTheDocument();
  });

  it('uses the singular for one row and the phrase while a filter is on', () => {
    render(<FilterBar {...props({ value: 'accepted', count: 1 })} />);
    expect(screen.getByRole('status')).toHaveTextContent('1 session with status "Accepted"');
    expect(screen.getByRole('button', { name: /Status: Accepted.*remove filter/ })).toBeInTheDocument();
  });

  it('removes the filter with the chip and with "Clear all filters"', async () => {
    const onChange = jest.fn();
    render(<FilterBar {...props({ value: 'accepted', count: 1, onChange })} />);
    await userEvent.click(screen.getByRole('button', { name: /remove filter/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(onChange).toHaveBeenNthCalledWith(1, '');
    expect(onChange).toHaveBeenNthCalledWith(2, '');
  });

  it('moves focus to the select when the filter is removed', () => {
    const { rerender } = render(<FilterBar {...props({ value: 'accepted', count: 1 })} />);
    rerender(<FilterBar {...props({ value: '', count: 4 })} />);
    expect(screen.getByLabelText('Status')).toHaveFocus();
  });

  it('does not move focus when a filter is chosen', () => {
    const { rerender } = render(<FilterBar {...props()} />);
    rerender(<FilterBar {...props({ value: 'paid', count: 2 })} />);
    expect(screen.getByLabelText('Status')).not.toHaveFocus();
  });
});
