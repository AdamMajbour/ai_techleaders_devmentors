import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { REVIEW_ITEMS, REVIEW_NOW } from '../../../.storybook/blocks/sampleData';
import { ReviewItem } from './ReviewItem';

const meta = {
  title: 'Product/Vault/ReviewItem',
  component: ReviewItem,
  args: { item: REVIEW_ITEMS[0], now: REVIEW_NOW, timeZone: 'UTC', onApprove: fn(), onReject: fn() },
  render: (args) => (
    <ul className="m-0 max-w-session list-none p-0">
      <ReviewItem {...args} />
    </ul>
  ),
} satisfies Meta<typeof ReviewItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WaitingForTheMentor: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /^Approve/ }));
    await expect(args.onApprove).toHaveBeenCalledWith('a1');
  },
};

export const RejectWithAReason: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Reason/), 'The webhook advice does not match what I wrote.');
    await userEvent.click(canvas.getByRole('button', { name: /^Reject/ }));
    await expect(args.onReject).toHaveBeenCalledWith('a1', 'The webhook advice does not match what I wrote.');
  },
};

export const OnlyMentorCited: Story = { args: { item: REVIEW_ITEMS[1] } };

export const Approving: Story = { args: { pendingAction: 'approve' } };

export const Rejecting: Story = { args: { pendingAction: 'reject' } };

export const ActionRefused: Story = { args: { actionError: 'This answer was already rejected by another mentor. Nothing is needed from you.' } };

export const Approved: Story = { args: { decision: 'approved' } };

export const Rejected: Story = { args: { decision: 'rejected' } };

export const TimeRanOut: Story = { args: { now: '2026-11-03T15:00:00Z' } };

export const LongAnswerAndNamesNarrow: Story = {
  args: {
    item: {
      ...REVIEW_ITEMS[0],
      ownNoteTitle: 'What to check before, during and after an ingress-nginx upgrade on bare metal clusters',
      otherMentors: ['Aleksandra Wojciechowska-Kowalczyk', 'Piotr Zieliński', 'Maria Wiśniewska'],
    },
  },
  render: (args) => (
    <ul className="m-0 w-80 list-none p-0">
      <ReviewItem {...args} />
    </ul>
  ),
};
