import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApprovalQueue, type ApprovalQueueState } from './ApprovalQueue';

const items = [
  { id: 'answer-1', question: 'How should I investigate a slow query?' },
  { id: 'answer-2', question: 'How do I model a retry safely?' },
];

const meta = {
  title: 'Patterns/Approval queue primitive',
  component: ApprovalQueue,
  args: {
    state: 'ready' satisfies ApprovalQueueState,
    items,
    emptyTitle: 'Nothing to review',
    emptyDescription: 'New approvals appear here.',
    errorMessage: 'The queue could not be loaded. Try again.',
    loadingMessage: 'Loading approvals…',
    onRetry: () => {},
    renderItem: (item: typeof items[number]) => <li key={item.id} className="border-b border-border py-panel-compact">{item.question}</li>,
  },
} satisfies Meta<typeof ApprovalQueue<typeof items[number]>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { state: 'loading' } };
export const Error: Story = { args: { state: 'error' } };
export const Empty: Story = { args: { state: 'empty', items: [] } };
