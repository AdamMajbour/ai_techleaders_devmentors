import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiResult } from '../../backend/api/types';
import { SessionThread, type SessionMessage } from './SessionThread';

const ok: ApiResult<unknown> = { ok: true, status: 201, data: {} };
const MESSAGES: SessionMessage[] = [
  { id: '1', authorId: 'seeker', authorName: 'Sam', sentAt: '2026-11-03T13:01:00Z', text: 'Ingress upgrade fails.' },
  { id: '2', authorId: 'mentor', authorName: 'Ada', sentAt: '2026-11-03T13:03:00Z', text: 'Try:\n```\nkubectl get pods\n```' },
];
const base = { viewerId: 'seeker', startsAt: '2026-11-03T13:00:00Z', endsAt: '2026-11-03T13:25:00Z', onSend: async () => ok, timeZone: 'UTC' };

describe('SessionThread', () => {
  it('shows the window in words, the messages in order, and a box that works while active', () => {
    render(<SessionThread {...base} now="2026-11-03T13:05:00Z" messages={MESSAGES} />);
    expect(screen.getByText('20 minutes left. The session ends at 13:25.')).toBeVisible();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Sam');
    expect(screen.getByLabelText('Message')).toBeEnabled();
  });

  it('marks only the viewer’s own messages with "(you)"', () => {
    render(<SessionThread {...base} now="2026-11-03T13:05:00Z" messages={MESSAGES} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('(you)');
    expect(items[1]).not.toHaveTextContent('(you)');
  });

  it('announces new messages politely', () => {
    render(<SessionThread {...base} now="2026-11-03T13:05:00Z" messages={MESSAGES} />);
    expect(screen.getByRole('list')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('list')).toHaveAttribute('aria-relevant', 'additions');
  });

  it('blocks the box before the session starts, with the reason', () => {
    render(<SessionThread {...base} now="2026-11-03T12:50:00Z" messages={[]} />);
    expect(screen.getByText('The session starts at 13:00.')).toBeVisible();
    expect(screen.getByLabelText('Message')).toBeDisabled();
    expect(screen.getByLabelText('Message')).toHaveAccessibleDescription(/has not started yet/);
  });

  it('stays readable after the end and blocks writing, with the reason', () => {
    render(<SessionThread {...base} now="2026-11-03T13:30:00Z" messages={MESSAGES} />);
    expect(screen.getByText('The session ended at 13:25. The conversation is read-only.')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByLabelText('Message')).toBeDisabled();
    expect(screen.getByLabelText('Message')).toHaveAccessibleDescription(/has ended/);
  });

  it('shows an empty state with a different line when nothing was written and the session is over', () => {
    const { rerender } = render(<SessionThread {...base} now="2026-11-03T13:05:00Z" messages={[]} />);
    expect(screen.getByText('The mentor will answer here.')).toBeVisible();
    rerender(<SessionThread {...base} now="2026-11-03T13:40:00Z" messages={[]} />);
    expect(screen.getByText('Nothing was written in this session.')).toBeVisible();
  });

  it('shows loading as a busy region with a text, and no message box yet', () => {
    const { container } = render(<SessionThread {...base} now="2026-11-03T13:05:00Z" messages={[]} status="loading" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading the conversation…');
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });

  it('shows a load error with a retry', async () => {
    const onRetry = jest.fn();
    render(<SessionThread {...base} now="2026-11-03T13:05:00Z" messages={[]} status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the messages and says refreshing failed, instead of replacing them with an error', () => {
    render(<SessionThread {...base} now="2026-11-03T13:05:00Z" messages={MESSAGES} refreshFailed />);
    expect(screen.getByRole('alert')).toHaveTextContent('New messages could not be loaded');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
