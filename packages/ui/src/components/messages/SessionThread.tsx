import type { ApiResult } from '../../backend/api/types';
import { EmptyState } from '../../backend/feedback/EmptyState';
import { ErrorMessage } from '../../backend/feedback/ErrorMessage';
import { LoadingMessage } from '../../backend/feedback/LoadingMessage';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Composer } from './Composer';
import { MessageItem } from './MessageItem';
import { SessionWindow, sessionPhase } from './SessionWindow';

export interface SessionMessage {
  id: string;
  authorId: string;
  authorName: string;
  sentAt: string;
  text: string;
}

export interface SessionThreadProps {
  messages: SessionMessage[];
  /** The person looking at the thread. Their own messages are marked "(you)". */
  viewerId: string;
  startsAt: string;
  endsAt: string;
  /** The server's time at the last poll. */
  now: string;
  status?: 'ready' | 'loading' | 'error';
  /** Polling failed but the messages already shown are still good. */
  refreshFailed?: boolean;
  onRetry?: () => void;
  onSend: (text: string) => Promise<ApiResult<unknown>>;
  timeZone?: string;
}

// The session view: one column with the conversation in the centre (R02.1), the window stated in words above
// it, and the message box below. New messages are announced politely. The box is blocked outside the window,
// with the reason written under it, and the thread stays readable after the end.
export function SessionThread({
  messages,
  viewerId,
  startsAt,
  endsAt,
  now,
  status = 'ready',
  refreshFailed = false,
  onRetry,
  onSend,
  timeZone,
}: SessionThreadProps) {
  const { phase } = sessionPhase(startsAt, endsAt, now);
  const blockedReason =
    phase === 'before' ? 'The session has not started yet. You can write when it starts.' : phase === 'ended' ? 'The session has ended. You can still read the conversation.' : undefined;

  return (
    <section aria-label="Session" className="flex w-full max-w-session flex-col gap-between-groups">
      <SessionWindow startsAt={startsAt} endsAt={endsAt} now={now} timeZone={timeZone} />
      {status === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-between-groups">
          <LoadingMessage message="Loading the conversation…" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : status === 'error' ? (
        <ErrorMessage message="The conversation could not be loaded. Check your connection and try again." onRetry={onRetry} />
      ) : (
        <>
          {refreshFailed ? (
            <Alert variant="destructive">
              <AlertDescription>New messages could not be loaded. We keep trying. What you see so far is still correct.</AlertDescription>
            </Alert>
          ) : null}
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description={phase === 'ended' ? 'Nothing was written in this session.' : 'The mentor will answer here.'}
            />
          ) : (
            <ol aria-live="polite" aria-relevant="additions" className="m-0 flex list-none flex-col p-0">
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  authorName={message.authorName}
                  sentAt={message.sentAt}
                  text={message.text}
                  own={message.authorId === viewerId}
                  timeZone={timeZone}
                />
              ))}
            </ol>
          )}
        </>
      )}
      {status === 'ready' ? <Composer onSend={onSend} blockedReason={blockedReason} /> : null}
    </section>
  );
}
