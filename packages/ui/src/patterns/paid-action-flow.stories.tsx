import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { BOOKINGS, MENTORS, QUESTION } from '../../.storybook/blocks/sampleData';
import type { ApiResult } from '../backend/api/types';
import { BookingRow } from '../components/bookings/BookingRow';
import { MentorProfileView, PaymentReturnView } from '../screens/e01-views';

// The pattern: the price and the refund rule come before the field the user fills in. The pay button says what
// it will charge and why it is blocked. The question is kept after every failure. The page the user returns to
// from the payment provider states what is known and what is not, and never claims success before the server did.
const meta = { title: 'Patterns/Paid action flow', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ok: ApiResult<unknown> = { ok: true, status: 201, data: { checkoutUrl: '#checkout' } };

export const PriceBeforeTheQuestion: Story = {
  render: () => <MentorProfileView mentor={MENTORS[0]} onSubmit={async () => ok} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const price = canvas.getByRole('region', { name: 'Price' });
    const field = canvas.getByLabelText(/Your question/);
    await expect(price.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  },
};

export const ButtonSaysWhyItIsBlocked: Story = {
  render: () => <MentorProfileView mentor={MENTORS[0]} onSubmit={async () => ok} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Pay 25 PLN and send' });
    await expect(button).toHaveAccessibleDescription('Write your question to continue');
    await userEvent.type(canvas.getByLabelText(/Your question/), QUESTION);
    await expect(button).toHaveAccessibleDescription('Accept the pilot terms to continue');
  },
};

export const PaymentFailsAndTheQuestionIsKept: Story = {
  render: () => (
    <MentorProfileView
      mentor={MENTORS[0]}
      onSubmit={async () => ({ ok: false, status: 502, error: { code: 'payment_unavailable', message: 'The payment provider did not answer. Nothing was charged. Try again in a minute.' } })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Your question/), QUESTION);
    await userEvent.click(canvas.getByRole('checkbox', { name: /pilot terms/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 25 PLN and send' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Nothing was charged');
    await expect(canvas.getByLabelText(/Your question/)).toHaveValue(QUESTION);
  },
};

export const ReturnConfirming: Story = { render: () => <PaymentReturnView state="confirming" testMode /> };
export const ReturnTakesLonger: Story = { render: () => <PaymentReturnView state="slow" testMode /> };
export const ReturnPaid: Story = { render: () => <PaymentReturnView state="paid" testMode /> };
export const ReturnFailed: Story = { render: () => <PaymentReturnView state="failed" testMode /> };
export const ReturnCancelled: Story = { render: () => <PaymentReturnView state="cancelled" testMode /> };
export const ReturnCouldNotBeConfirmed: Story = { render: () => <PaymentReturnView state="reconcileFailed" testMode /> };

export const WhereTheMoneyStandsAfterADecline: Story = {
  render: () => (
    <ul className="m-0 flex max-w-content list-none flex-col p-0">
      {(['pending_approval', 'processing', 'refunded'] as const).map((refund) => (
        <BookingRow key={refund} booking={{ ...BOOKINGS[2], id: refund, refund }} viewer="seeker" />
      ))}
    </ul>
  ),
};
