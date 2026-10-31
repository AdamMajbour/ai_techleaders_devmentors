import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { BOOKINGS, LONG_QUESTION, MENTOR_BOOKINGS } from '../../../.storybook/blocks/sampleData';
import { BookingRow } from './BookingRow';

const meta = {
  title: 'Product/Bookings/BookingRow',
  component: BookingRow,
  args: { booking: BOOKINGS[0], viewer: 'mentor', href: '#booking', onAccept: fn(), onDecline: fn() },
  render: (args) => (
    <ul className="m-0 max-w-content list-none p-0">
      <BookingRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof BookingRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MentorAwaitingDecision: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Accept the question from Sam/ }));
    await expect(args.onAccept).toHaveBeenCalledWith('b1');
  },
};

export const SeekerWaiting: Story = { args: { viewer: 'seeker' } };

export const AcceptRunning: Story = { args: { pendingAction: 'accept' } };

export const OverlapRefused: Story = {
  args: { actionError: 'You already have a session at that time. Choose a later start or decline this one.' },
};

export const LongQuestionIsCut: Story = {
  args: { booking: { ...BOOKINGS[0], question: LONG_QUESTION } },
};

export const DeclinedWithRefund: Story = { args: { booking: BOOKINGS[2], viewer: 'seeker' } };

export const QuestionNoLongerVisibleToTheMentor: Story = {
  args: { booking: MENTOR_BOOKINGS[2] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('You can no longer see this question.')).toBeVisible();
  },
};

export const ManyInAList: Story = {
  render: (args) => (
    <ul className="m-0 max-w-content list-none p-0">
      {MENTOR_BOOKINGS.map((booking) => (
        <BookingRow key={booking.id} {...args} booking={booking} />
      ))}
    </ul>
  ),
};

export const NarrowLongText: Story = {
  args: { booking: { ...BOOKINGS[0], counterpartName: 'Aleksandra Wojciechowska-Kowalczyk', question: LONG_QUESTION } },
  render: (args) => (
    <ul className="m-0 w-80 list-none p-0">
      <BookingRow {...args} />
    </ul>
  ),
};
