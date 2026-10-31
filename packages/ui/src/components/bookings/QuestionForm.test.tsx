import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiResult } from '../../backend/api/types';
import { QuestionForm } from './QuestionForm';

const ok: ApiResult<unknown> = { ok: true, status: 201, data: { checkoutUrl: 'https://pay.example/c/1' } };
const QUESTION = 'Ingress upgrade from 1.9 to 1.28 fails on staging.';

function setup(props: Partial<React.ComponentProps<typeof QuestionForm>> = {}) {
  const onSubmit = jest.fn(async () => ok);
  const onSuccess = jest.fn();
  render(
    <QuestionForm
      mentorName="Ada"
      priceMinor={2500}
      currency="EUR"
      termsHref="/terms"
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      {...props}
    />,
  );
  return { onSubmit, onSuccess };
}

async function fillAndAccept(question = QUESTION) {
  await userEvent.type(screen.getByLabelText(/Your question/), question);
  await userEvent.click(screen.getByRole('checkbox', { name: /pilot terms/ }));
}

describe('QuestionForm', () => {
  it('shows the price and the refund rule before the question field (R04)', () => {
    setup();
    const price = screen.getByRole('region', { name: 'Price' });
    const field = screen.getByLabelText(/Your question/);
    expect(price.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(price).toHaveTextContent('25 EUR for a 25-minute text session with Ada');
    expect(price).toHaveTextContent('you are refunded');
  });

  it('blocks the button and says what is missing, in order', async () => {
    setup();
    const button = screen.getByRole('button', { name: 'Pay 25 EUR and send' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Write your question to continue');

    await userEvent.type(screen.getByLabelText(/Your question/), 'short');
    expect(button).toHaveAccessibleDescription('Add a little more detail: at least 10 characters');

    await userEvent.clear(screen.getByLabelText(/Your question/));
    await userEvent.type(screen.getByLabelText(/Your question/), QUESTION);
    expect(button).toHaveAccessibleDescription('Accept the pilot terms to continue');

    await userEvent.click(screen.getByRole('checkbox', { name: /pilot terms/ }));
    // The blocked button is wrapped with its reason, so it is a new element once nothing blocks it.
    expect(screen.getByRole('button', { name: 'Pay 25 EUR and send' })).not.toHaveAttribute('aria-disabled');
  });

  it('does not submit while blocked', async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pay 25 EUR and send' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed question with the accepted terms, and reports success only after the server confirmed', async () => {
    let resolve: (value: ApiResult<unknown>) => void = () => {};
    const onSubmit = jest.fn(() => new Promise<ApiResult<unknown>>((r) => (resolve = r)));
    const onSuccess = jest.fn();
    render(<QuestionForm mentorName="Ada" priceMinor={2500} currency="EUR" termsHref="/terms" onSubmit={onSubmit} onSuccess={onSuccess} />);
    await fillAndAccept(`  ${QUESTION}  `);
    await userEvent.click(screen.getByRole('button', { name: 'Pay 25 EUR and send' }));
    expect(onSubmit).toHaveBeenCalledWith({ question: QUESTION, acceptedTerms: true });
    expect(onSuccess).not.toHaveBeenCalled();
    resolve(ok);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ checkoutUrl: 'https://pay.example/c/1' }));
  });

  it('blocks everything while sending, so the question cannot be sent twice', async () => {
    const onSubmit = jest.fn(() => new Promise<ApiResult<unknown>>(() => {}));
    render(<QuestionForm mentorName="Ada" priceMinor={2500} currency="EUR" termsHref="/terms" onSubmit={onSubmit} />);
    await fillAndAccept();
    await userEvent.click(screen.getByRole('button', { name: 'Pay 25 EUR and send' }));
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByLabelText(/Your question/)).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps the question and focuses it when the server rejects it', async () => {
    const onSubmit = jest.fn(async (): Promise<ApiResult<unknown>> => ({
      ok: false,
      status: 400,
      error: { code: 'validation_failed', message: 'bad', fieldErrors: { question: ['The question is too long for one session.'] } },
    }));
    setup({ onSubmit });
    await fillAndAccept();
    await userEvent.click(screen.getByRole('button', { name: 'Pay 25 EUR and send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The question is too long for one session.');
    await waitFor(() => expect(screen.getByLabelText(/Your question/)).toHaveFocus());
    expect(screen.getByLabelText(/Your question/)).toHaveValue(QUESTION);
  });

  it('shows a form-level error as an alert, keeps the question and lets the user try again', async () => {
    const onSubmit = jest.fn(async (): Promise<ApiResult<unknown>> => ({
      ok: false,
      status: 0,
      error: { code: 'network_error', message: 'The server could not be reached.' },
    }));
    setup({ onSubmit });
    await fillAndAccept();
    await userEvent.click(screen.getByRole('button', { name: 'Pay 25 EUR and send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not be reached.');
    expect(screen.getByLabelText(/Your question/)).toHaveValue(QUESTION);
    expect(screen.getByRole('checkbox', { name: /pilot terms/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Pay 25 EUR and send' })).not.toHaveAttribute('aria-disabled');
  });

  it('checks the question when the user leaves it after editing', async () => {
    setup();
    await userEvent.type(screen.getByLabelText(/Your question/), 'abc');
    await userEvent.tab();
    expect(screen.getByLabelText(/Your question/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits with Ctrl+Enter once it is allowed', async () => {
    const { onSubmit } = setup();
    await fillAndAccept();
    await userEvent.type(screen.getByLabelText(/Your question/), '{Control>}{Enter}{/Control}');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('never pre-ticks the terms', () => {
    setup();
    expect(screen.getByRole('checkbox', { name: /pilot terms/ })).not.toBeChecked();
  });

  it('writes the price into the button, so the user knows what will be charged', () => {
    setup({ priceMinor: 1000 });
    expect(screen.getByRole('button', { name: 'Pay 10 EUR and send' })).toBeInTheDocument();
  });

  it('works without a mentor, for a vault answer: own description and hint, own limit', async () => {
    const { onSubmit } = setup({
      mentorName: undefined,
      priceMinor: 1000,
      priceDescription: "for one answer written by AI from mentors' notes",
      fieldHint: 'Mentors whose notes are cited read your question before you get the answer.',
      maxLength: 2000,
    });
    expect(screen.getByRole('region', { name: 'Price' })).toHaveTextContent("10 EUR for one answer written by AI from mentors' notes");
    expect(screen.getByLabelText(/Your question/)).toHaveAccessibleDescription('Mentors whose notes are cited read your question before you get the answer.');
    expect(screen.getByLabelText(/Your question/)).toHaveAttribute('maxlength', '2000');
    await fillAndAccept();
    await userEvent.click(screen.getByRole('button', { name: 'Pay 10 EUR and send' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('has a sensible default without a mentor name', () => {
    setup({ mentorName: undefined });
    expect(screen.getByRole('region', { name: 'Price' })).toHaveTextContent('25 EUR for one answer');
    expect(screen.getByLabelText(/Your question/)).toHaveAccessibleDescription(/^Paste the error/);
  });

  it('moves focus to the terms when the server refuses the consent', async () => {
    const onSubmit = jest.fn(async (): Promise<ApiResult<unknown>> => ({
      ok: false,
      status: 400,
      error: { code: 'validation_failed', message: 'bad', fieldErrors: { acceptedTerms: ['Accept the current pilot terms to continue.'] } },
    }));
    setup({ onSubmit });
    await fillAndAccept();
    await userEvent.click(screen.getByRole('button', { name: 'Pay 25 EUR and send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Accept the current pilot terms to continue.');
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /pilot terms/ })).toHaveFocus());
    expect(screen.getByLabelText(/Your question/)).toHaveValue(QUESTION);
  });
});
