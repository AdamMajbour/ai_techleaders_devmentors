import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MENTORS, PRICE, SESSION } from '../../.storybook/blocks/sampleData';
import { MySessionsView, type MySessionsState } from './my-sessions-view';
import type { SessionRowData } from '../components/bookings';

const SESSIONS: SessionRowData[] = [
  { id: 's1', mentor: MENTORS[0], status: 'accepted', startsAt: SESSION.startsAt, ...PRICE },
  { id: 's2', mentor: MENTORS[1], status: 'paid', ...PRICE },
  { id: 's3', mentor: MENTORS[2], status: 'declined', refund: 'processing', ...PRICE },
  { id: 's4', mentor: MENTORS[3], status: 'expired', refund: 'refunded', ...PRICE },
];

const meta = {
  title: 'Product/Screens/My sessions',
  component: MySessionsView,
  parameters: { layout: 'padded' },
  args: {
    state: 'ready' satisfies MySessionsState,
    sessions: SESSIONS,
    timeZone: 'Europe/Warsaw',
    onRetry: fn(),
  },
} satisfies Meta<typeof MySessionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { state: 'loading', sessions: [] } };
export const Empty: Story = { args: { state: 'empty', sessions: [] } };
export const Error: Story = { args: { state: 'error', sessions: [] } };
export const FilteredByStatus: Story = { args: { initialStatus: 'accepted' } };
export const NoResultsForFilter: Story = { args: { initialStatus: 'pending_payment' } };
