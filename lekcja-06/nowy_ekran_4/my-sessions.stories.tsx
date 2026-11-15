import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { MENTORS, PRICE } from '../../packages/ui/.storybook/blocks/sampleData';
import { MySessionsView, type SessionRowData, type SessionsLoadState } from './my-sessions-view';

// Exercise screen: Storybook does not pick this folder up (the `stories` glob is `../src/**`), so these stories
// run only after the folder is moved to `packages/ui/src/screens` (Contributing, "Where an example screen lives").
const meta = {
  title: 'Product/Screens/My sessions (exercise)',
  component: MySessionsView,
  parameters: { layout: 'padded' },
  args: { status: 'ready', sessions: [], timeZone: 'Europe/Warsaw' },
} satisfies Meta<typeof MySessionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

const [ada, jan, maria, piotr] = MENTORS;
const card = (mentor: (typeof MENTORS)[number]) => ({
  id: mentor.id,
  name: mentor.name,
  headline: mentor.headline,
  technologies: mentor.technologies,
});

const SESSIONS: SessionRowData[] = [
  { id: 's1', mentor: card(ada), status: 'accepted', startsAt: '2026-11-03T13:00:00Z', ...PRICE },
  { id: 's2', mentor: card(jan), status: 'paid', ...PRICE },
  { id: 's3', mentor: card(maria), status: 'declined', refund: 'processing', ...PRICE },
  { id: 's4', mentor: card(piotr), status: 'expired', refund: 'refunded', ...PRICE },
  { id: 's5', mentor: card(jan), status: 'payment_failed', ...PRICE },
  { id: 's6', mentor: card(ada), status: 'pending_payment', ...PRICE },
];

const MANY: SessionRowData[] = Array.from({ length: 12 }, (_, i) => ({
  ...SESSIONS[i % SESSIONS.length],
  id: `m${i}`,
}));

export const Loading: Story = {
  args: { status: 'loading' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('Loading your sessions…');
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    await expect(canvas.queryByLabelText('Status')).not.toBeInTheDocument();
  },
};

export const Ready: Story = {
  args: { sessions: SESSIONS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'My sessions' })).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('6 sessions');
    await expect(canvas.getByText('3 Nov 2026, 14:00')).toBeVisible();
  },
};

export const FilteredByStatus: Story = {
  args: { sessions: SESSIONS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Status'), 'Accepted');
    await expect(canvas.getByRole('status')).toHaveTextContent('1 session with status "Accepted"');
    await expect(canvas.getByRole('button', { name: 'Status: Accepted , remove filter' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all filters' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('6 sessions');
    await expect(canvas.getByLabelText('Status')).toHaveFocus();
  },
};

export const NoResultsForTheFilter: Story = {
  args: { sessions: SESSIONS.filter((session) => session.status !== 'declined'), initialFilter: 'declined' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No sessions with status "Declined"')).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('0 sessions with status "Declined"');
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filter' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('5 sessions');
    await expect(canvas.getByLabelText('Status')).toHaveFocus();
  },
};

export const NothingYet: Story = {
  args: { sessions: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No sessions yet')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Find a mentor' })).toBeVisible();
    await expect(canvas.queryByLabelText('Status')).not.toBeInTheDocument();
  },
};

export const LoadFailed: Story = {
  args: { status: 'error', onRetry: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Sessions could not be loaded');
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(canvas.queryByLabelText('Status')).not.toBeInTheDocument();
  },
};

// Retry swaps the error for the loading state; the chosen filter comes back with the list.
function RetryKeepsTheFilter() {
  const [status, setStatus] = useState<SessionsLoadState>('error');
  const retry = () => {
    setStatus('loading');
    setTimeout(() => setStatus('ready'), 50);
  };
  return <MySessionsView status={status} sessions={SESSIONS} timeZone="Europe/Warsaw" onRetry={retry} initialFilter="accepted" />;
}

export const RetryKeepsTheChosenFilter: Story = {
  render: () => <RetryKeepsTheFilter />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('1 session with status "Accepted"'));
  },
};

export const ManySessions: Story = {
  args: { sessions: MANY },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('12 sessions');
  },
};

export const LongTextNarrow: Story = {
  args: {
    sessions: [
      {
        id: 'long',
        mentor: {
          id: 'long',
          name: 'Aleksandra Wojciechowska-Kowalczyk-Przybylska',
          headline:
            'Upgraded ingress controllers on bare metal clusters for several years and wrote down every failure that she met on the way',
          technologies: ['Kubernetes', 'Linux networking', 'Go', 'PostgreSQL', 'GitHub Actions', 'Terraform'],
        },
        status: 'declined',
        refund: 'pending_approval',
        ...PRICE,
      },
    ],
  },
  render: (args) => (
    <div className="w-80">
      <MySessionsView {...args} />
    </div>
  ),
};
