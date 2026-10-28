import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Skeleton } from '../../components/ui/skeleton';
import { LoadingMessage } from './LoadingMessage';

const meta = {
  title: 'Primitives/LoadingMessage',
  component: LoadingMessage,
  args: { message: 'Loading mentors…' },
} satisfies Meta<typeof LoadingMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Loading mentors…');
  },
};

export const WithSkeletonBlocks: Story = {
  render: (args) => (
    <div aria-busy="true" className="flex max-w-session flex-col gap-between-groups">
      <LoadingMessage {...args} />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
};

export const SaysWhatLoads: Story = { args: { message: 'Confirming your payment…' } };

export const LongMessageNarrow: Story = {
  args: { message: 'Still confirming your payment. This takes longer than usual, and you can leave this page.' },
  render: (args) => (
    <div className="w-80">
      <LoadingMessage {...args} />
    </div>
  ),
};
