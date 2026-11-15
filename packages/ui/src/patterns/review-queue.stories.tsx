import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { REVIEW_ITEMS, REVIEW_NOW } from '../../.storybook/blocks/sampleData';
import { PreviewsView } from '../screens/e02-views';

// The pattern: things that wait for one person's decision, each with everything needed to decide next to the
// decision itself. The consequence of each choice is written next to it, a refused action says why, and a decided
// or expired item says so instead of keeping its buttons.
const meta = { title: 'Patterns/Review queue', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const EverythingToDecideIsInTheRow: Story = {
  render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now={REVIEW_NOW} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = canvas.getAllByRole('listitem');
    await expect(items).toHaveLength(2);
    await expect(within(items[0]).getByText(/Question from a seeker/)).toBeVisible();
    await expect(within(items[0]).getByText('Generated answer')).toBeVisible();
    await expect(within(items[0]).getByRole('button', { name: /^Approve/ })).toBeVisible();
  },
};

export const ConsequenceIsWrittenNextToTheChoice: Story = {
  render: () => <PreviewsView state="ready" items={REVIEW_ITEMS.slice(0, 1)} now={REVIEW_NOW} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText(/Reason/)).toHaveAccessibleDescription(/the whole answer is rejected/);
  },
};

export const OneActionRunsAtATime: Story = { render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now={REVIEW_NOW} pendingId="a1" /> };

export const RefusedActionSaysWhy: Story = {
  render: () => (
    <PreviewsView state="ready" items={REVIEW_ITEMS} now={REVIEW_NOW} errorId="a1" actionError="This answer was already rejected by another mentor. Nothing is needed from you." />
  ),
};

export const DecidedItemsKeepNoButtons: Story = {
  render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now={REVIEW_NOW} decisions={{ a1: 'approved', a2: 'rejected' }} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).toBeNull();
  },
};

export const ExpiredItemsSaySo: Story = { render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now="2026-11-03T15:10:00Z" /> };

export const EmptyQueue: Story = { render: () => <PreviewsView state="empty" items={[]} now={REVIEW_NOW} /> };
export const Loading: Story = { render: () => <PreviewsView state="loading" items={[]} now={REVIEW_NOW} /> };
export const LoadFails: Story = { render: () => <PreviewsView state="error" items={[]} now={REVIEW_NOW} /> };
