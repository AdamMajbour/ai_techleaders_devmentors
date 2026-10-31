'use client';

// Screen "My sessions": the seeker's list of sessions with a filter by status. Test of the design system
// (lekcja-06/nowy_ekran_3). Built only from `@devmentor/ui`; the row and the filter bar are composed here because
// no row component or filter bar exists yet (What is missing).
//
// Where the data comes from: `GET /api/bookings?role=seeker` (booking spec, API table). One response holds all of the
// seeker's bookings, newest first. Each item carries the mentor's card (`mentor: { id, name, headline, technologies }`),
// `status`, `refundStatus`, `priceMinor` and `currency` (the price of that booking) and, for an accepted booking,
// `startsAt`. The status filter runs here, in the client. A real page passes the response to this view; the screen has no
// fetch of its own (the only allowed fetch to `/api/*` is `apiCall` in the package).
import { X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import {
  Alert,
  AlertDescription,
  BookingStatus,
  Button,
  EmptyState,
  ErrorMessage,
  Field,
  LoadingMessage,
  Select,
  Skeleton,
  TextLink,
  bookingStatusLabel,
  formatClock,
  formatDate,
  formatPrice,
  type BookingStatusValue,
  type RefundState,
} from '@devmentor/ui';

export interface SeekerSession {
  id: string;
  status: BookingStatusValue;
  refundStatus: RefundState;
  priceMinor: number;
  currency: string;
  /** Only for an accepted session. */
  startsAt?: string;
  mentor: { id: string; name: string; headline: string; technologies: string[] };
}

export type MySessionsState = 'loading' | 'ready' | 'error';

// The six statuses in the order of the type `BookingStatusValue` (it exists only as a type, so the list is repeated).
const STATUSES: BookingStatusValue[] = ['pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired'];

// The page shell, copied from `screens/e01-views.tsx` (What is missing: "Page shell").
function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-between-groups py-between-groups">
      <h1 className="m-0 text-page-title font-strong text-headline">{title}</h1>
      {children}
    </main>
  );
}

export function MySessionsView({
  state,
  sessions,
  initialStatus = '',
  refreshFailed = false,
  timeZone,
  onRetry,
}: {
  state: MySessionsState;
  sessions: SeekerSession[];
  initialStatus?: BookingStatusValue | '';
  /** The list loaded before and the last refresh failed: the last result stays. */
  refreshFailed?: boolean;
  /** The `timeZone` of the seeker's profile (an IANA name). */
  timeZone: string;
  onRetry?: () => void;
}) {
  const [status, setStatus] = useState<BookingStatusValue | ''>(initialStatus);
  const selectRef = useRef<HTMLSelectElement>(null);

  const shown = status ? sessions.filter((session) => session.status === status) : sessions;
  const statusText = status ? bookingStatusLabel(status, 'seeker').text : '';
  const loaded = state === 'ready';
  const hasSessions = sessions.length > 0;

  const clear = () => {
    setStatus('');
    selectRef.current?.focus();
  };

  return (
    <Page title="My sessions">
      {loaded && hasSessions ? (
        <div className="flex flex-col gap-between-groups">
          <div className="max-w-session">
            <Field label="Status">
              <Select ref={selectRef} density="compact" value={status} onChange={(event) => setStatus(event.target.value as BookingStatusValue | '')}>
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
        </div>
      ) : null}

      {loaded ? (
        <p role="status" aria-live="polite" className="m-0 text-label text-muted-foreground">
          {shown.length === 1 ? '1 session' : `${shown.length} sessions`}
          {status ? ` with status ${statusText}` : ''}
        </p>
      ) : null}

      {loaded && refreshFailed ? (
        <Alert variant="destructive">
          <AlertDescription>The list could not be refreshed. It shows the last result.</AlertDescription>
          <Button variant="outline" size="sm" className="w-fit" onClick={onRetry}>
            Try again
          </Button>
        </Alert>
      ) : null}

      {state === 'loading' ? (
        <div aria-busy="true" className="flex flex-col">
          <LoadingMessage message="Loading your sessions…" />
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex flex-col gap-group border-b border-border py-panel-compact">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {state === 'error' ? <ErrorMessage message="Sessions could not be loaded. Check your connection and try again." onRetry={onRetry} /> : null}

      {loaded && !hasSessions ? (
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

      {loaded && hasSessions && shown.length === 0 ? (
        <EmptyState
          title={`No sessions with status ${statusText}`}
          description="No session has this status. Choose another status or clear the filter."
          action={
            <Button variant="outline" onClick={clear}>
              Clear filter
            </Button>
          }
        />
      ) : null}

      {loaded && shown.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-group">
                <h2 className="m-0 break-words text-body font-strong text-headline">{session.mentor.name}</h2>
                <p className="m-0 break-words text-body text-foreground">{session.mentor.headline}</p>
                <p className="m-0 text-label text-muted-foreground">{session.mentor.technologies.join(' · ')}</p>
                {session.startsAt ? (
                  <p className="m-0 text-label tabular-nums text-foreground">
                    {formatDate(session.startsAt, timeZone)}, {formatClock(session.startsAt, timeZone)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-group md:items-end">
                <BookingStatus status={session.status} viewer="seeker" refund={session.refundStatus} />
                <p className="m-0 text-body tabular-nums">{formatPrice(session.priceMinor, session.currency)}</p>
                <TextLink href={`#${session.id}`} className="w-fit text-label">
                  Open<span className="sr-only"> the session with {session.mentor.name}</span>
                </TextLink>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Page>
  );
}
