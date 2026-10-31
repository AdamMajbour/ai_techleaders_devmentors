import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiResult } from '../../backend/api/types';
import { PublishNoticePanel } from './PublishNoticePanel';

const ok: ApiResult<unknown> = { ok: true, status: 200, data: { status: 'published' } };
const ITEMS = ['The note is sent to an AI provider every time an answer is written.', 'You can take the note down at any time.'];

function setup(props: Partial<React.ComponentProps<typeof PublishNoticePanel>> = {}) {
  const onPublish = jest.fn(async () => ok);
  const onSuccess = jest.fn();
  render(<PublishNoticePanel noticeItems={ITEMS} noticeVersion="v1" onPublish={onPublish} onSuccess={onSuccess} {...props} />);
  return { onPublish, onSuccess };
}

describe('PublishNoticePanel', () => {
  it('lists every point of the notice in order before the consent', () => {
    setup();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('sent to an AI provider every time');
    const list = screen.getByRole('list');
    const box = screen.getByRole('checkbox');
    expect(list.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('never pre-ticks the consent and blocks the button with the reason', () => {
    setup();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Publish note' })).toHaveAccessibleDescription('Tick the box to publish');
  });

  it('publishes with the consent and the version of the notice that was shown', async () => {
    const { onPublish, onSuccess } = setup();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Publish note' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ status: 'published' }));
    expect(onPublish).toHaveBeenCalledWith({ consent: true, noticeVersion: 'v1' });
  });

  it('does not publish while the box is not ticked', async () => {
    const { onPublish } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Publish note' }));
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('shows why the server refused, for example a changed notice, and does not report success', async () => {
    const { onSuccess } = setup({
      onPublish: async () => ({ ok: false, status: 409, error: { code: 'notice_changed', message: 'The notice changed. Read it again before you publish.' } }),
    });
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Publish note' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The notice changed. Read it again');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('blocks everything while publishing', async () => {
    setup({ onPublish: () => new Promise<ApiResult<unknown>>(() => {}) });
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Publish note' }));
    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('keeps the button blocked, with the owner’s reason, even when the box is ticked', async () => {
    setup({ blockedReason: 'Publishing opens when the notice has been reviewed.' });
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Publish note' })).toHaveAccessibleDescription('Publishing opens when the notice has been reviewed.');
  });
});
