import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { FilterBar } from './FilterBar';

const OPTIONS = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'paid', label: 'Waiting for the mentor' },
  { value: 'declined', label: 'Declined' },
];

const meta = {
  title: 'Primitives/FilterBar',
  component: FilterBar,
  args: {
    label: 'Status',
    allLabel: 'All statuses',
    options: OPTIONS,
    value: '',
    onChange: fn(),
    count: 4,
    noun: { one: 'session', many: 'sessions' },
    phrase: (label: string) => `with status "${label}"`,
  },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoFilter: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('4 sessions');
    await expect(canvas.queryByRole('button', { name: /remove filter/ })).not.toBeInTheDocument();
  },
};

export const FilterOn: Story = {
  args: { value: 'accepted', count: 1 },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('1 session with status "Accepted"');
    await userEvent.click(canvas.getByRole('button', { name: /Status: Accepted.*remove filter/ }));
    await expect(args.onChange).toHaveBeenCalledWith('');
  },
};

export const NoResultsForTheFilter: Story = {
  args: { value: 'paid', count: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('0 sessions with status "Waiting for the mentor"');
    await expect(canvas.getByRole('button', { name: 'Clear all filters' })).toBeVisible();
  },
};

export const LongLabelNarrow: Story = {
  args: { value: 'declined', count: 2 },
  render: (args) => (
    <div className="w-80">
      <FilterBar {...args} />
    </div>
  ),
};
