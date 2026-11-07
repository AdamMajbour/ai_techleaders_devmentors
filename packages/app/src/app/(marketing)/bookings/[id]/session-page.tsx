'use client';

import { useCallback, useRef, useState } from 'react';
import { apiCall, ErrorMessage, LoadingMessage, SessionThread, usePolling } from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';

type Message = { id: string; authorId: string; authorName: string; sentAt: string; text: string };
type PageData = {
  items: Message[];
  nextCursor: string | null;
  pollCursor: string | null;
  serverTime: string;
  viewerId: string;
  session: { startsAt: string; endsAt: string };
};
type PollCursor = { after: string | null; retry: number };

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export function SessionPage({ bookingId }: { bookingId: string }) {
  const [cursor, setCursor] = useState<PollCursor>({ after: null, retry: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [sendFailed, setSendFailed] = useState(false);
  const fetchMessages = useCallback(async ({ after }: PollCursor) => {
    const query = after ? `?after=${encodeURIComponent(after)}` : '';
    const page = unwrap(await apiCall<PageData>(`/api/bookings/${encodeURIComponent(bookingId)}/messages${query}`));
    const known = new Set(messagesRef.current.map((message) => message.id));
    messagesRef.current = [...messagesRef.current, ...page.items.filter((message) => !known.has(message.id))];
    setMessages(messagesRef.current);
    setCursor((current) => ({ ...current, after: page.pollCursor ?? current.after }));
    return { ...page, items: messagesRef.current };
  }, [bookingId]);
  const polling = usePolling({ fetcher: fetchMessages, intervalMs: 3_000, cursor });
  const displayedMessages = [...messages];
  for (const message of polling.data?.items ?? []) {
    if (!displayedMessages.some((existing) => existing.id === message.id)) displayedMessages.push(message);
  }

  const send = useCallback(async (text: string) => {
    const result = await apiCall<Message>(`/api/bookings/${encodeURIComponent(bookingId)}/messages`, {
      method: 'POST',
      json: { body: text },
    });
    if (result.ok) {
      if (!messagesRef.current.some((message) => message.id === result.data.id)) {
        messagesRef.current = [...messagesRef.current, result.data];
        setMessages(messagesRef.current);
      }
      setCursor((current) => ({ after: null, retry: current.retry + 1 }));
      setSendFailed(false);
    } else setSendFailed(true);
    return result;
  }, [bookingId]);

  if (!polling.data && polling.status === 'error') {
    return <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-compact"><h1 className="m-0 text-page-title font-strong text-headline">Session</h1><ErrorMessage message={polling.error?.message ?? 'The conversation could not be loaded. Refresh the page and try again.'} onRetry={() => setCursor((current) => ({ ...current, retry: current.retry + 1 }))} /></main>;
  }
  if (!polling.data) return <main className="mx-auto max-w-session p-panel-compact" aria-busy="true"><h1 className="m-0 text-page-title font-strong text-headline">Session</h1><LoadingMessage message="Loading the conversation…" /></main>;

  return (
    <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-roomy">
      <h1 className="m-0 text-page-title font-strong text-headline">Session</h1>
      {sendFailed ? <p role="status" className="m-0 text-body text-destructive">Your message could not be sent. Check the session window and try again.</p> : null}
      <SessionThread
        messages={displayedMessages}
        viewerId={polling.data.viewerId}
        startsAt={polling.data.session.startsAt}
        endsAt={polling.data.session.endsAt}
        now={polling.data.serverTime}
        status="ready"
        refreshFailed={polling.status === 'error' && messages.length > 0}
        onRetry={() => setCursor((current) => ({ ...current, retry: current.retry + 1 }))}
        onSend={send}
      />
    </main>
  );
}
