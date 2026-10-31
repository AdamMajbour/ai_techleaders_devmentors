import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MENTORS, PRICE } from '../../packages/ui/.storybook/blocks/sampleData';
import { MySessionsView, type SessionItem } from './MySessionsView';

const SESSIONS: SessionItem[] = [
  { id: 's1', mentor: MENTORS[0], status: 'accepted', ...PRICE },
  { id: 's2', mentor: MENTORS[1], status: 'paid', ...PRICE },
  { id: 's3', mentor: MENTORS[2], status: 'declined', refund: 'processing', ...PRICE },
  { id: 's4', mentor: MENTORS[3], status: 'expired', refund: 'refunded', ...PRICE },
];

const MANY: SessionItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `m${i}`,
  mentor: MENTORS[i % MENTORS.length],
  status: (['accepted', 'paid', 'declined', 'expired'] as const)[i % 4],
  ...PRICE,
}));

const meta = {
  title: 'Product/Screens/My sessions (design system test)',
  component: MySessionsView,
  parameters: { layout: 'padded' },
  args: { state: 'ready', sessions: SESSIONS, onRetry: fn() },
} satisfies Meta<typeof MySessionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { state: 'loading', sessions: [] } };
export const NothingHereYet: Story = { args: { state: 'empty', sessions: [] } };
export const LoadFailed: Story = { args: { state: 'error', sessions: [] } };
export const FilteredByStatus: Story = { args: { initialStatus: 'accepted' } };
export const NoResultsForTheFilter: Story = { args: { initialStatus: 'pending_payment' } };
export const ManyItems: Story = { args: { sessions: MANY } };

export const LongTextNarrow: Story = {
  args: {
    sessions: [
      {
        id: 'long',
        mentor: {
          id: 'long',
          name: 'Aleksandra Wojciechowska-Przybylska',
          headline:
            'Upgraded ingress controllers on bare metal clusters for several years and wrote down every failure that the upgrade guide does not mention',
          technologies: ['Kubernetes', 'Linux networking', 'PostgreSQL', 'GitHub Actions', 'Terraform'],
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
