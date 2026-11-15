'use client';

// The seeker's "My sessions". Data: GET /api/bookings?role=seeker, joined with each mentor's card (headline, technologies).
import { X } from 'lucide-react';
import { useState } from 'react';
import {
  BookingStatus,
  bookingStatusLabel,
  Button,
  EmptyState,
  ErrorMessage,
  Field,
  formatPrice,
  LoadingMessage,
  Select,
  Skeleton,
  TextLink,
  type BookingStatusValue,
  type MentorRowData,
  type RefundState,
} from '@devmentor/ui';

export type MySessionsState = 'loading' | 'ready' | 'empty' | 'error';

export interface SessionItem {
  id: string;
  mentor: MentorRowData;
  status: BookingStatusValue;
  priceMinor: number;
  currency: string;
  refund?: RefundState;
}

const STATUSES: BookingStatusValue[] = ['pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired'];

export function MySessionsView({
  state,
  sessions,
  initialStatus = '',
  onRetry,
}: {
  state: MySessionsState;
  sessions: SessionItem[];
  initialStatus?: BookingStatusValue | '';
  onRetry?: () => void;
}) {
  const [status, setStatus] = useState<BookingStatusValue | ''>(initialStatus);
  const shown = status ? sessions.filter((session) => session.status === status) : sessions;
  const statusText = status ? bookingStatusLabel(status, 'seeker').text : '';
  const clear = () => setStatus('');

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-between-groups py-between-groups">
      <h1 className="m-0 text-page-title font-strong text-headline">My sessions</h1>

      {state === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-between-groups">
          <LoadingMessage message="Loading your sessions…" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-group">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {state === 'error' ? <ErrorMessage message="Sessions could not be loaded. Check your connection and try again." onRetry={onRetry} /> : null}

      {state === 'empty' ? (
        <EmptyState
          title="No sessions yet"
          description="Pick a mentor and ask your first question. Your sessions appear here."
          action={
            <Button asChild>
              <a href="#mentors">Find a mentor</a>
            </Button>
          }
        />
      ) : null}

      {state === 'ready' ? (
        <>
          <div className="flex flex-col gap-between-groups">
            <div className="max-w-session">
              <Field label="Status">
                <Select
                  density="compact"
                  value={status}
                  onChange={(event) => setStatus(STATUSES.find((value) => value === event.target.value) ?? '')}
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {bookingStatusLabel(value, 'seeker').text}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {status ? (
              <div className="flex flex-wrap items-center gap-group">
                <Button variant="outline" size="sm" onClick={clear}>
                  Status: {statusText}
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">, remove filter</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={clear}>
                  Clear all filters
                </Button>
              </div>
            ) : null}
            <p role="status" aria-live="polite" className="m-0 text-label text-muted-foreground">
              {shown.length === 1 ? '1 session' : `${shown.length} sessions`}
              {status ? ` with status ${statusText}` : ''}
            </p>
          </div>

          {shown.length === 0 ? (
            <EmptyState
              title={`No sessions with status ${statusText}`}
              description="No session has this status. Choose another status or clear the filter."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear filter
                </Button>
              }
            />
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {shown.map(({ id, mentor, status: sessionStatus, priceMinor, currency, refund }) => (
                <li
                  key={id}
                  className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-group">
                    <h2 className="m-0 text-body font-strong text-headline">{mentor.name}</h2>
                    <p className="m-0 text-body text-foreground">{mentor.headline}</p>
                    <p className="m-0 text-label text-muted-foreground">{mentor.technologies.join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-group md:items-end">
                    <BookingStatus status={sessionStatus} viewer="seeker" refund={refund} />
                    <span className="text-body font-strong tabular-nums text-headline">{formatPrice(priceMinor, currency)}</span>
                    <TextLink href={`#${id}`} className="text-label">
                      Open<span className="sr-only"> the session with {mentor.name}</span>
                    </TextLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </main>
  );
}
