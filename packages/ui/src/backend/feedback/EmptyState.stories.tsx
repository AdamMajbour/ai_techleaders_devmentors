import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../../components/ui/button';
import { TextLink } from '../../components/ui/text-link';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
  args: {
    title: 'No questions yet',
    description: 'Ask a mentor your first question. You see the price before you write.',
    action: <Button>Find a mentor</Button>,
  },
  argTypes: { action: { control: false } },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NothingHereYet: Story = {};

export const NoResultsForFilters: Story = {
  args: {
    title: 'No mentors for Kubernetes',
    description: 'No mentor lists this technology yet. Try another technology or clear the filter.',
    action: <Button variant="outline">Clear filter</Button>,
  },
};

export const WithLinkInsteadOfButton: Story = {
  args: {
    title: 'No notes published',
    description: 'Notes you publish feed AI answers, and you see every answer that cites them.',
    action: <TextLink href="#new-note">Write your first note</TextLink>,
  },
};

export const LongTextNarrow: Story = {
  render: (args) => (
    <div className="w-80">
      <EmptyState
        {...args}
        title="There are no vault answers waiting for your review at the moment"
        description="When a seeker buys an answer that cites one of your notes, it appears here for you to approve or reject before they see it, until the pilot ends on 14 December."
      />
    </div>
  ),
};

export const ActionIsReachable: Story = {
  args: { action: <Button onClick={fn()}>Find a mentor</Button> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No questions yet')).toBeVisible();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Find a mentor' })).toHaveFocus();
  },
};
