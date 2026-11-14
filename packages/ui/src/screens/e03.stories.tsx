import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { MENTORS, QUESTION, pilotRows } from '../../.storybook/blocks/sampleData';
import type { ApiResult } from '../backend/api/types';
import { MentorProfileView } from './e01-views';
import { PilotCountsPage, TermsPageView } from './e03-views';

// Full-page examples of the E03 epic: the terms the seeker accepts at payment (E03-S01) and the counts the founders
// read at the two reviews (E03-S03). The payout of mentors (E03-S02) is not built: it has no specification.
const meta = { title: 'Product/Screens/E03 Terms and pilot counts', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ok: ApiResult<unknown> = { ok: true, status: 201, data: { checkoutUrl: '#checkout' } };

// 1. Accepting the terms at payment
export const ConsentAtPaymentNotYetAccepted: Story = {
  render: () => <MentorProfileView mentor={MENTORS[0]} onSubmit={async () => ok} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Your question/), QUESTION);
    await expect(canvas.getByRole('checkbox', { name: /pilot terms/ })).not.toBeChecked();
    await expect(canvas.getByRole('button', { name: 'Pay 25 PLN and send' })).toHaveAccessibleDescription('Accept the pilot terms to continue');
  },
};

export const ConsentAtPaymentServerWantsTheCurrentTerms: Story = {
  render: () => (
    <MentorProfileView
      mentor={MENTORS[0]}
      onSubmit={async () => ({
        ok: false,
        status: 400,
        error: { code: 'validation_failed', message: 'Check the terms.', fieldErrors: { acceptedTerms: ['The terms changed. Read them again and accept the current pilot terms.'] } },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Your question/), QUESTION);
    await userEvent.click(canvas.getByRole('checkbox', { name: /pilot terms/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 25 PLN and send' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The terms changed');
    await waitFor(() => expect(canvas.getByRole('checkbox', { name: /pilot terms/ })).toHaveFocus());
  },
};

export const PilotTermsPage: Story = { render: () => <TermsPageView /> };

// 2. Pilot counts for the founders
export const CountsAtTheStart: Story = { render: () => <PilotCountsPage rows={pilotRows('start')} asOf="2026-11-04T09:15:00Z" timeZone="UTC" /> };
export const CountsAtTheFirstReview: Story = { render: () => <PilotCountsPage rows={pilotRows('review')} asOf="2026-11-30T09:15:00Z" timeZone="UTC" /> };
export const CountsNoConditionMet: Story = { render: () => <PilotCountsPage rows={pilotRows('allClear')} asOf="2026-12-14T09:15:00Z" timeZone="UTC" /> };
export const CountsLoading: Story = { render: () => <PilotCountsPage status="loading" /> };
export const CountsError: Story = { render: () => <PilotCountsPage status="error" /> };
export const CountsNotForYou: Story = { render: () => <PilotCountsPage page="notFound" /> };
