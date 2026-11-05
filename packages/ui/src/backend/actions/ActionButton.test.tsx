import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiResult } from '../api/types';
import { ActionButton } from './ActionButton';

const ok: ApiResult<unknown> = { ok: true, status: 200, data: {} };
const failure: ApiResult<unknown> = {
  ok: false,
  status: 409,
  error: { code: 'conflict', message: 'This booking has already been accepted.' },
};

describe('ActionButton', () => {
  it('shows loading and prevents duplicate runs until the request finishes', async () => {
    let finish: (result: ApiResult<unknown>) => void = () => undefined;
    const run = jest.fn(() => new Promise<ApiResult<unknown>>((resolve) => (finish = resolve)));
    render(<ActionButton label="Accept booking" run={run} onDone={() => undefined} />);

    await userEvent.click(screen.getByRole('button', { name: 'Accept booking' }));

    const button = screen.getByRole('button', { name: 'Working…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(run).toHaveBeenCalledTimes(1);

    await act(async () => finish(ok));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept booking' })).toBeEnabled());
  });

  it('calls onDone after a successful result', async () => {
    const onDone = jest.fn();
    render(<ActionButton label="Accept booking" run={async () => ok} onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: 'Accept booking' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('shows the server error and allows the action to be retried', async () => {
    const run = jest.fn().mockResolvedValueOnce(failure).mockResolvedValueOnce(ok);
    const onDone = jest.fn();
    render(<ActionButton label="Accept booking" run={run} onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: 'Accept booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This booking has already been accepted.');
    expect(screen.getByRole('button', { name: 'Accept booking' })).toBeEnabled();
    expect(onDone).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Accept booking' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(run).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks for confirmation before running and respects cancellation', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const run = jest.fn(async () => ok);
    const onDone = jest.fn();
    render(
      <ActionButton
        label="Approve refund"
        confirm="Approve this refund?"
        run={run}
        onDone={onDone}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Approve refund' }));

    expect(confirm).toHaveBeenCalledWith('Approve this refund?');
    expect(run).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Approve refund' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));

    confirm.mockRestore();
  });

  it('re-enables after a rejected request', async () => {
    const run = jest.fn().mockRejectedValue(new Error('network unavailable'));
    render(<ActionButton label="Retry" run={run} onDone={() => undefined} />);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });
});
