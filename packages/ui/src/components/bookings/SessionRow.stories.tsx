import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { SessionRow, type SessionRowData } from './SessionRow';

const ADA = {
  name: 'Ada Kowalska',
  headline: 'Upgraded ingress-nginx on bare metal clusters and wrote down what broke',
  technologies: ['Kubernetes', 'Go', 'Linux networking'],
};
const JAN = {
  name: 'Jan Nowak',
  headline: 'Moved a monolith from cron jobs to a queue without losing a single order',
  technologies: ['PostgreSQL', 'Node.js', 'Queues'],
};
const PRICE = { priceMinor: 2500, currency: 'EUR' };

const meta = {
  title: 'Product/Bookings/SessionRow',
  component: SessionRow,
  args: {
    session: { id: 's1', mentor: ADA, status: 'accepted', startsAt: '2026-11-03T13:00:00Z', ...PRICE },
    timeZone: 'Europe/Warsaw',
    href: '#s1',
  },
} satisfies Meta<typeof SessionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// SessionRow renders one <li>: a story always puts it inside a <ul> (no shared decorator, like BookingRow and MentorRow).
export const Accepted: Story = {
  render: (args) => (
    <ul className="m-0 flex list-none flex-col p-0">
      <SessionRow {...args} />
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2, name: 'Ada Kowalska' })).toBeVisible();
    await expect(canvas.getByText('3 Nov 2026, 14:00')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Open the session with Ada Kowalska, 3 Nov 2026, 14:00' })).toBeVisible();
  },
};

export const WaitingForTheMentor: Story = {
  args: { session: { id: 's2', mentor: JAN, status: 'paid', ...PRICE } },
  render: (args) => (
    <ul className="m-0 flex list-none flex-col p-0">
      <SessionRow {...args} />
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Waiting for the mentor')).toBeVisible();
    await expect(canvas.queryByText(/2026/)).not.toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'Open the session with Jan Nowak, Waiting for the mentor' })).toBeVisible();
  },
};

export const DeclinedWithRefundProcessing: Story = {
  args: { session: { id: 's3', mentor: JAN, status: 'declined', refund: 'processing', ...PRICE } },
  render: (args) => (
    <ul className="m-0 flex list-none flex-col p-0">
      <SessionRow {...args} />
    </ul>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Refund processing')).toBeVisible();
  },
};

export const ExpiredRefunded: Story = {
  args: { session: { id: 's4', mentor: ADA, status: 'expired', refund: 'refunded', ...PRICE } },
  render: (args) => (
    <ul className="m-0 flex list-none flex-col p-0">
      <SessionRow {...args} />
    </ul>
  ),
};

export const WithoutTechnologies: Story = {
  args: { session: { id: 's5', mentor: { ...JAN, technologies: [] }, status: 'paid', ...PRICE } },
  render: (args) => (
    <ul className="m-0 flex list-none flex-col p-0">
      <SessionRow {...args} />
    </ul>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(/·/)).not.toBeInTheDocument();
  },
};

export const LongTextNarrow: Story = {
  args: {
    session: {
      id: 's6',
      mentor: {
        name: 'Aleksandra Wojciechowska-Przybylska',
        headline: 'Upgraded ingress controllers on bare metal clusters for several years and wrote down every failure the upgrade guide does not mention',
        technologies: ['Kubernetes', 'Linux networking', 'PostgreSQL', 'GitHub Actions', 'Terraform'],
      },
      status: 'accepted',
      startsAt: '2026-11-10T08:30:00Z',
      ...PRICE,
    },
  },
  render: (args) => (
    <ul className="m-0 flex w-80 list-none flex-col p-0">
      <SessionRow {...args} />
    </ul>
  ),
};

const SESSIONS: SessionRowData[] = [
  { id: 'a', mentor: ADA, status: 'accepted', startsAt: '2026-11-03T13:00:00Z', ...PRICE },
  { id: 'b', mentor: JAN, status: 'paid', ...PRICE },
  { id: 'c', mentor: ADA, status: 'declined', refund: 'processing', ...PRICE },
];

export const InAList: Story = {
  render: (args) => (
    <ul className="m-0 flex list-none flex-col p-0">
      {SESSIONS.map((session) => (
        <SessionRow key={session.id} session={session} timeZone={args.timeZone} href={`#${session.id}`} />
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    await expect(canvas.getAllByRole('link', { name: /Open the session with Ada Kowalska/ })).toHaveLength(2);
  },
};
