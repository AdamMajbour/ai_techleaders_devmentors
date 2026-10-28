import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Check, Clock, X } from 'lucide-react';
import { StatusBadge } from './status-badge';

const meta = {
  title: 'Primitives/StatusBadge',
  component: StatusBadge,
  args: { children: 'Paid', tone: 'neutral' },
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'active', 'danger'] } },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Tones: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-wrap items-center gap-between-groups p-0">
      <li><StatusBadge>Paid</StatusBadge></li>
      <li><StatusBadge>Waiting for the mentor</StatusBadge></li>
      <li><StatusBadge tone="active">Awaiting your review</StatusBadge></li>
      <li><StatusBadge tone="active">Accepted</StatusBadge></li>
      <li><StatusBadge tone="danger">Declined</StatusBadge></li>
      <li><StatusBadge tone="danger">Expired</StatusBadge></li>
    </ul>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-wrap items-center gap-between-groups p-0">
      <li><StatusBadge icon={<Clock aria-hidden="true" className="size-4" />}>Waiting</StatusBadge></li>
      <li><StatusBadge tone="active" icon={<Check aria-hidden="true" className="size-4" />}>Accepted</StatusBadge></li>
      <li><StatusBadge tone="danger" icon={<X aria-hidden="true" className="size-4" />}>Declined</StatusBadge></li>
    </ul>
  ),
};

export const LongTextNarrow: Story = {
  render: () => (
    <div className="w-60">
      <StatusBadge tone="danger">Refund pending approval by the operator</StatusBadge>
    </div>
  ),
};

export const TextIsAlwaysPresent: Story = {
  args: { children: 'Declined', tone: 'danger' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Declined')).toBeVisible();
  },
};
