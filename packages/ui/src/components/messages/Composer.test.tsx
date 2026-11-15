import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiResult } from '../../backend/api/types';
import { Composer } from './Composer';

const ok: ApiResult<unknown> = { ok: true, status: 201, data: {} };
const fail: ApiResult<unknown> = { ok: false, status: 500, error: { code: 'internal_error', message: 'Try again in a minute.' } };

describe('Composer', () => {
  it('sends the trimmed message and clears the box only after the server stored it', async () => {
    const onSend = jest.fn(async () => ok);
    render(<Composer onSend={onSend} />);
    const box = screen.getByLabelText('Message');
    await userEvent.type(box, '  Check the webhook  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith('Check the webhook');
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('keeps what was written and says why when sending fails', async () => {
    render(<Composer onSend={async () => fail} />);
    const box = screen.getByLabelText('Message');
    await userEvent.type(box, 'important text');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Message not sent. Try again in a minute.');
    expect(box).toHaveValue('important text');
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('sends with Ctrl+Enter (R02.2)', async () => {
    const onSend = jest.fn(async () => ok);
    render(<Composer onSend={onSend} />);
    await userEvent.type(screen.getByLabelText('Message'), 'quick{Control>}{Enter}{/Control}');
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('quick'));
  });

  it('does not send an empty message', async () => {
    const onSend = jest.fn(async () => ok);
    render(<Composer onSend={onSend} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Message'), '   ');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('blocks everything while sending, so a message cannot go twice', async () => {
    let resolve: (value: ApiResult<unknown>) => void = () => {};
    const onSend = jest.fn(() => new Promise<ApiResult<unknown>>((r) => (resolve = r)));
    render(<Composer onSend={onSend} />);
    await userEvent.type(screen.getByLabelText('Message'), 'once');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByLabelText('Message')).toBeDisabled();
    expect(onSend).toHaveBeenCalledTimes(1);
    resolve(ok);
    await waitFor(() => expect(screen.getByLabelText('Message')).toHaveValue(''));
  });

  it('is blocked with the reason written under it and linked to the box', () => {
    render(<Composer onSend={async () => ok} blockedReason="The session has ended. You can still read the conversation." />);
    const box = screen.getByLabelText('Message');
    expect(box).toBeDisabled();
    expect(box).toHaveAccessibleDescription('The session has ended. You can still read the conversation.');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('shows how many characters are left only near the limit', async () => {
    render(<Composer onSend={async () => ok} maxLength={20} />);
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Message'), 'x'.repeat(19));
    expect(screen.getByText('1 characters left')).toBeVisible();
  });
});
