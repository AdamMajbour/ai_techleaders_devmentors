import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { BOOKINGS, MENTOR_BOOKINGS, MENTORS, MESSAGES, SESSION } from '../../.storybook/blocks/sampleData';
import type { ApiResult } from '../backend/api/types';
import { BookingsView, LoginView, MentorProfileView, MentorsListView, PaymentReturnView, SessionView, VerifyView } from './e01-views';

// Full-page examples of the E01 booking flow. Each story is one state of one screen; the epic page
// "Epics > E01 Booking flow" lists them as a state map.
const meta = { title: 'Product/Screens/E01 Booking flow', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ok: ApiResult<unknown> = { ok: true, status: 201, data: { checkoutUrl: '#checkout' } };

// 1. Login
export const LoginForm: Story = { render: () => <LoginView state="form" /> };
export const LoginSending: Story = { render: () => <LoginView state="sending" /> };
export const LoginSent: Story = { render: () => <LoginView state="sent" /> };
export const LoginRateLimited: Story = { render: () => <LoginView state="rateLimited" /> };
export const LoginServerError: Story = { render: () => <LoginView state="serverError" /> };

// 2. Verify the link
export const VerifyChecking: Story = { render: () => <VerifyView state="checking" /> };
export const VerifyInvalidLink: Story = { render: () => <VerifyView state="invalidLink" /> };
export const VerifyServerError: Story = { render: () => <VerifyView state="serverError" /> };

// 3. Mentors list
export const MentorsLoading: Story = { render: () => <MentorsListView state="loading" mentors={[]} /> };
export const MentorsReady: Story = { render: () => <MentorsListView state="ready" mentors={MENTORS} /> };
export const MentorsFilteredByTechnology: Story = {
  render: () => <MentorsListView state="ready" mentors={MENTORS.slice(0, 2)} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Technology'), 'Go');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(1);
    await userEvent.selectOptions(canvas.getByLabelText('Technology'), 'Queues');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(1);
  },
};
export const MentorsEmpty: Story = { render: () => <MentorsListView state="empty" mentors={[]} /> };
export const MentorsError: Story = { render: () => <MentorsListView state="error" mentors={[]} /> };

// 4. Mentor page with the question form
export const MentorProfile: Story = {
  render: () => <MentorProfileView mentor={MENTORS[0]} onSubmit={async () => ok} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Test mode')).toBeVisible();
    await expect(canvas.getByRole('region', { name: 'Price' })).toBeVisible();
  },
};

// 5. Payment return
export const PaymentConfirming: Story = { render: () => <PaymentReturnView state="confirming" testMode /> };
export const PaymentSlow: Story = { render: () => <PaymentReturnView state="slow" testMode /> };
export const PaymentPaid: Story = { render: () => <PaymentReturnView state="paid" testMode /> };
export const PaymentFailed: Story = { render: () => <PaymentReturnView state="failed" testMode /> };
export const PaymentCancelled: Story = { render: () => <PaymentReturnView state="cancelled" testMode /> };
export const PaymentCouldNotBeConfirmed: Story = { render: () => <PaymentReturnView state="reconcileFailed" testMode /> };

// 6. The seeker's bookings
export const SeekerBookingsLoading: Story = { render: () => <BookingsView state="loading" viewer="seeker" bookings={[]} /> };
export const SeekerBookingsReady: Story = { render: () => <BookingsView state="ready" viewer="seeker" bookings={BOOKINGS} /> };
export const SeekerBookingsEmpty: Story = { render: () => <BookingsView state="empty" viewer="seeker" bookings={[]} /> };
export const SeekerBookingsError: Story = { render: () => <BookingsView state="error" viewer="seeker" bookings={[]} /> };

// 7. The mentor's bookings, with Accept and Decline
export const MentorBookingsReady: Story = { render: () => <BookingsView state="ready" viewer="mentor" bookings={MENTOR_BOOKINGS} /> };
export const MentorBookingsAcceptRunning: Story = { render: () => <BookingsView state="ready" viewer="mentor" bookings={MENTOR_BOOKINGS} pendingId="b1" /> };
export const MentorBookingsOverlap: Story = {
  render: () => (
    <BookingsView
      state="ready"
      viewer="mentor"
      bookings={MENTOR_BOOKINGS}
      errorId="b1"
      actionError="You already have a session at that time. Choose a later start or decline this one."
    />
  ),
};
export const MentorBookingsEmpty: Story = { render: () => <BookingsView state="empty" viewer="mentor" bookings={[]} /> };

// 8. The session
const session = { ...SESSION, mentorName: 'Ada Kowalska', messages: MESSAGES };
export const SessionActive: Story = { render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" /> };
export const SessionBeforeStart: Story = { render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T12:50:00Z" messages={[]} /> };
export const SessionEnded: Story = { render: () => <SessionView {...session} viewerId="mentor" now="2026-11-03T13:40:00Z" /> };
export const SessionLoading: Story = { render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" status="loading" /> };
export const SessionLoadFailed: Story = { render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" status="error" /> };
export const SessionRefreshFailed: Story = { render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" refreshFailed /> };
