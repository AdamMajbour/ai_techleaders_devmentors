import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { MENTORS } from '../../packages/ui/.storybook/blocks/sampleData';
import { MySessionsView, type SeekerSession } from './MySessionsView';

// One story per state of the screen "My sessions". The data is what `GET /api/bookings?role=seeker` returns
// (booking spec): the mentor's card, the status, the refund, the price of the booking and, for an accepted
// session, `startsAt`. The names and headlines are the example mentors of the design system.
const [ada, jan, maria, piotr] = MENTORS.map((mentor) => ({
  id: mentor.id,
  name: mentor.name,
  headline: mentor.headline,
  technologies: mentor.technologies,
}));

const SESSIONS: SeekerSession[] = [
  { id: 's1', mentor: ada, status: 'accepted', refundStatus: 'none', priceMinor: 2500, currency: 'EUR', startsAt: '2026-11-03T13:00:00Z' },
  { id: 's2', mentor: jan, status: 'paid', refundStatus: 'none', priceMinor: 2500, currency: 'EUR' },
  { id: 's3', mentor: maria, status: 'declined', refundStatus: 'processing', priceMinor: 2500, currency: 'EUR' },
  { id: 's4', mentor: piotr, status: 'expired', refundStatus: 'refunded', priceMinor: 2500, currency: 'EUR' },
  { id: 's5', mentor: ada, status: 'payment_failed', refundStatus: 'none', priceMinor: 2500, currency: 'EUR' },
  { id: 's6', mentor: jan, status: 'pending_payment', refundStatus: 'none', priceMinor: 2500, currency: 'EUR' },
];

const MANY: SeekerSession[] = Array.from({ length: 25 }, (_, index) => ({
  ...SESSIONS[index % SESSIONS.length],
  id: `m${index}`,
}));

const LONG: SeekerSession[] = [
  {
    id: 'l1',
    mentor: {
      id: 'long',
      name: 'Aleksandra Wojciechowska-Kowalczyk',
      headline: 'Upgraded ingress controllers on bare metal clusters for several years and wrote down every failure that the rollbacks hid',
      technologies: ['Kubernetes', 'Go', 'Linux networking', 'PostgreSQL', 'Terraform', 'GitHub Actions'],
    },
    status: 'accepted',
    refundStatus: 'none',
    priceMinor: 2500,
    currency: 'EUR',
    startsAt: '2026-11-03T13:00:00Z',
  },
];

const TIME_ZONE = 'Europe/Warsaw';

const meta = {
  title: 'Product/Screens/My sessions',
  component: MySessionsView,
  parameters: { layout: 'padded' },
  args: { state: 'ready', sessions: SESSIONS, timeZone: TIME_ZONE, onRetry: fn() },
} satisfies Meta<typeof MySessionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('6 sessions');
    await expect(canvas.getByText('3 Nov 2026, 14:00')).toBeVisible();
  },
};

export const FilteredByStatus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Status'), 'Accepted');
    await expect(canvas.getByRole('status')).toHaveTextContent('1 session with status Accepted');
    await expect(canvas.getByRole('button', { name: 'Status: Accepted , remove filter' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all filters' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('6 sessions');
    await expect(canvas.getByLabelText('Status')).toHaveFocus();
  },
};

export const NoResultsForTheFilter: Story = {
  args: { sessions: SESSIONS.filter((session) => session.status !== 'expired'), initialStatus: 'expired' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No sessions with status Not answered in time')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filter' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('5 sessions');
  },
};

export const NothingHereYet: Story = { args: { sessions: [] } };

export const Loading: Story = { args: { state: 'loading', sessions: [] } };

export const LoadFailed: Story = { args: { state: 'error', sessions: [] } };

export const LoadFailedWithAFilterOn: Story = { args: { state: 'error', sessions: [], initialStatus: 'accepted' } };

export const RefreshFailed: Story = { args: { refreshFailed: true } };

export const ManyRows: Story = { args: { sessions: MANY } };

export const LongTextNarrow: Story = {
  args: { sessions: LONG },
  render: (args) => (
    <div className="w-80">
      <MySessionsView {...args} />
    </div>
  ),
};
