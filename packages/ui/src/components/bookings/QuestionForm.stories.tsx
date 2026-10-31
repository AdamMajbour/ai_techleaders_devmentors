import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { ApiResult } from '../../backend/api/types';
import { QUESTION } from '../../../.storybook/blocks/sampleData';
import { QuestionForm, type QuestionFormProps } from './QuestionForm';

const ok: ApiResult<unknown> = { ok: true, status: 201, data: { checkoutUrl: '#checkout' } };
const failure = (status: number, error: { code: string; message: string; fieldErrors?: Record<string, string[]> }): ApiResult<unknown> => ({ ok: false, status, error });

const meta = {
  title: 'Product/Bookings/QuestionForm',
  component: QuestionForm,
  args: {
    mentorName: 'Ada Kowalska',
    priceMinor: 2500,
    currency: 'EUR',
    termsHref: '#terms',
    termsHint: 'Your question is kept until the pilot ends and then deleted.',
    // A mock at runtime. Typed as the prop so a story can replace it with a plain function.
    onSubmit: fn(async () => ok) as QuestionFormProps['onSubmit'],
    onSuccess: fn(),
  },
  render: (args) => (
    <div className="max-w-session">
      <QuestionForm {...args} />
    </div>
  ),
} satisfies Meta<typeof QuestionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function fill(canvasElement: HTMLElement, text = QUESTION) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText(/Your question/), text);
  await userEvent.click(canvas.getByRole('checkbox', { name: /pilot terms/ }));
  return canvas;
}

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Pay 25 EUR and send' })).toHaveAccessibleDescription('Write your question to continue');
  },
};

export const SubmitsAfterTheTermsAreAccepted: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = await fill(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 25 EUR and send' }));
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalledWith({ checkoutUrl: '#checkout' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ question: QUESTION, acceptedTerms: true });
  },
};

export const Sending: Story = {
  args: { onSubmit: () => new Promise<ApiResult<unknown>>(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = await fill(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 25 EUR and send' }));
    await expect(canvas.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  },
};

export const ServerRejectsTheQuestion: Story = {
  args: {
    onSubmit: async () =>
      failure(400, { code: 'validation_failed', message: 'Check the question.', fieldErrors: { question: ['The question is too long for one session. Shorten it and send again.'] } }),
  },
  play: async ({ canvasElement }) => {
    const canvas = await fill(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 25 EUR and send' }));
    await waitFor(() => expect(canvas.getByLabelText(/Your question/)).toHaveFocus());
    await expect(canvas.getByLabelText(/Your question/)).toHaveValue(QUESTION);
  },
};

export const ServerUnreachable: Story = {
  args: { onSubmit: async () => failure(0, { code: 'network_error', message: 'The server could not be reached. Check your connection and try again.' }) },
  play: async ({ canvasElement }) => {
    const canvas = await fill(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 25 EUR and send' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('could not be reached');
    await expect(canvas.getByLabelText(/Your question/)).toHaveValue(QUESTION);
  },
};

export const LongNameNarrow: Story = {
  args: { mentorName: 'Aleksandra Wojciechowska-Kowalczyk' },
  render: (args) => (
    <div className="w-80">
      <QuestionForm {...args} />
    </div>
  ),
};
