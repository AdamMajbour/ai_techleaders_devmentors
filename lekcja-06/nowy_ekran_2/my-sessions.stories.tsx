import type { Meta, StoryObj } from '@storybook/react-vite';
import { MySessionsView, type SessionItem } from './MySessionsView';

// One story per state of the screen "My sessions" (agent test 2). Names and questions are invented; the price is the
// 25 EUR text session. Note: Storybook only reads `packages/ui/src/**` (see Contributing, "Where an example screen lives"),
// so this file is not picked up until it is moved to `packages/ui/src/screens`.
const SESSIONS: SessionItem[] = [
  {
    id: 's1',
    mentor: { id: 'ada', name: 'Ada Kowalska', headline: 'Upgraded ingress-nginx on bare metal clusters and wrote down what broke', technologies: ['Kubernetes', 'Go', 'Linux networking'] },
    status: 'accepted',
    startsAt: '2026-11-03T13:25:00Z',
    priceMinor: 2500,
    currency: 'EUR',
  },
  {
    id: 's2',
    mentor: { id: 'jan', name: 'Jan Nowak', headline: 'Moved a monolith from cron jobs to a queue without losing a single order', technologies: ['PostgreSQL', 'Node.js', 'Queues'] },
    status: 'paid',
    priceMinor: 2500,
    currency: 'EUR',
  },
  {
    id: 's3',
    mentor: { id: 'maria', name: 'Maria Wiśniewska', headline: 'Found the N+1 query that made a dashboard load for nine seconds', technologies: ['Python', 'Django', 'PostgreSQL'] },
    status: 'declined',
    refund: 'processing',
    priceMinor: 2500,
    currency: 'EUR',
  },
  {
    id: 's4',
    mentor: { id: 'piotr', name: 'Piotr Zieliński', headline: 'Set up reproducible builds for a team of twelve', technologies: ['Docker', 'GitHub Actions', 'Bazel'] },
    status: 'expired',
    refund: 'refunded',
    priceMinor: 2500,
    currency: 'EUR',
  },
  {
    id: 's5',
    mentor: { id: 'ewa', name: 'Ewa Lewandowska', headline: 'Traced a payment retry bug to a clock skew between two services', technologies: ['Java', 'Kafka'] },
    status: 'payment_failed',
    priceMinor: 2500,
    currency: 'EUR',
  },
];

const meta = { title: 'Product/Screens/My sessions (agent test 2)', component: MySessionsView, parameters: { layout: 'padded' } } satisfies Meta<typeof MySessionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: { state: 'loading', sessions: [] } };
export const Ready: Story = { args: { state: 'ready', sessions: SESSIONS } };
export const NothingYet: Story = { args: { state: 'ready', sessions: [] } };
export const LoadFailed: Story = { args: { state: 'error', sessions: [] } };
export const FilteredByStatus: Story = { args: { state: 'ready', sessions: SESSIONS, initialStatus: 'accepted' } };
export const NoResultsForTheFilter: Story = {
  args: { state: 'ready', sessions: SESSIONS.filter((session) => session.status !== 'declined'), initialStatus: 'declined' },
};
export const LoadFailedWhileFilterIsActive: Story = { args: { state: 'error', sessions: [], initialStatus: 'accepted' } };
export const RefreshFailed: Story = { args: { state: 'ready', sessions: SESSIONS, refreshFailed: true } };
// 30 rows: above 25 rows What is missing says a pagination component is needed. None exists, so every row is shown.
const MANY: SessionItem[] = Array.from({ length: 30 }, (_, index) => ({
  ...SESSIONS[index % SESSIONS.length],
  id: `many-${index}`,
}));
export const ManyItems: Story = { args: { state: 'ready', sessions: MANY } };
export const LongTextNarrow: Story = {
  args: {
    state: 'ready',
    sessions: [
      {
        id: 's9',
        mentor: {
          id: 'long',
          name: 'Aleksandra Wojciechowska-Kowalczykiewicz',
          headline: 'Upgraded ingress controllers on bare metal clusters for several years and wrote down every outage, its cause and the fix',
          technologies: ['Kubernetes', 'Go', 'Linux networking', 'PostgreSQL', 'GitHub Actions', 'Terraform'],
        },
        status: 'accepted',
        startsAt: '2026-11-03T13:25:00Z',
        priceMinor: 2500,
        currency: 'EUR',
      },
    ],
  },
  render: (args) => (
    <div className="w-80">
      <MySessionsView {...args} />
    </div>
  ),
};
