import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookingStatus, type BookingStatusValue, type BookingViewer, type RefundState } from './BookingStatus';

const STATUSES: BookingStatusValue[] = ['pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired'];
const REFUNDS: Exclude<RefundState, 'none'>[] = ['pending_approval', 'processing', 'refunded'];

const meta = {
  title: 'Product/Bookings/BookingStatus',
  component: BookingStatus,
  args: { status: 'paid', viewer: 'seeker' },
  argTypes: {
    status: { control: 'select', options: STATUSES },
    viewer: { control: 'inline-radio', options: ['seeker', 'mentor'] },
    refund: { control: 'select', options: ['none', ...REFUNDS] },
  },
} satisfies Meta<typeof BookingStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

function Table({ viewer }: { viewer: BookingViewer }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-group p-0">
      {STATUSES.map((status) => (
        <li key={status}>
          <BookingStatus status={status} viewer={viewer} />
        </li>
      ))}
    </ul>
  );
}

export const Playground: Story = {};

export const ReadByTheSeeker: Story = { render: () => <Table viewer="seeker" /> };

export const ReadByTheMentor: Story = { render: () => <Table viewer="mentor" /> };

export const WhereTheMoneyStands: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-col gap-group p-0">
      {REFUNDS.map((refund) => (
        <li key={refund}>
          <BookingStatus status="declined" viewer="seeker" refund={refund} />
        </li>
      ))}
    </ul>
  ),
};

export const NarrowWraps: Story = {
  args: { status: 'expired', refund: 'pending_approval' },
  render: (args) => (
    <div className="w-40">
      <BookingStatus {...args} />
    </div>
  ),
};
