import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StatusBadge } from './StatusBadge';

const labels = {
  pending_payment: { text: 'Awaiting payment', tone: 'neutral' },
  awaiting_decision: { text: 'Awaiting your decision', tone: 'active' },
  accepted: { text: 'Accepted', tone: 'active' },
  declined: { text: 'Declined', tone: 'danger' },
  refund_processing: { text: 'Refund processing', tone: 'neutral' },
} as const;

const meta = {
  title: 'Backend/StatusBadge',
  component: StatusBadge,
  args: { status: 'pending_payment', labels },
  argTypes: {
    status: { control: 'select', options: Object.keys(labels) },
    labels: { control: false },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const LifecycleStates: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-wrap items-center gap-between-groups p-0">
      {Object.keys(labels).map((status) => (
        <li key={status}>
          <StatusBadge status={status} labels={labels} />
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Awaiting payment')).toBeVisible();
    await expect(canvas.getByText('Awaiting your decision')).toBeVisible();
    await expect(canvas.getByText('Declined')).toBeVisible();
  },
};

export const UnmappedStatus: Story = {
  args: { status: 'needs_review' },
};
