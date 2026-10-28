'use client';

// "My sessions": the seeker's list of their own bookings, filtered by status. Built only from @devmentor/ui.
//
// Where the data comes from (booking spec, API table): `GET /api/bookings?role=seeker&page=`. Each item carries
// the booking (`id`, `status`, `refundStatus`, price) and the mentor's card (`mentor: { id, name, headline,
// technologies }`), so this list needs no second request. An accepted booking also carries `startsAt`. In the
// product the page calls it through `apiCall` and passes the result to this view; the view itself only draws.
// `headline` is what this screen calls the mentor's "specialization" (Decided 2026-10-28).
import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
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

export interface SessionItem {
  id: string;
  mentor: { id: string; name: string; headline: string; technologies: string[] };
  status: BookingStatusValue;
  refund?: RefundState;
  priceMinor: number;
  currency: string;
  /** Only for an accepted booking. A booking with no start time shows no date. */
  startsAt?: string;
}

export type MySessionsState = 'loading' | 'ready' | 'error';

// The order of the status type, as the filter lists it (List with filters, section 5).
const STATUSES: BookingStatusValue[] = ['pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired'];

// The page shell, copied from `Page` in screens/e01-views.tsx (What is missing: "Page shell").
function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-between-groups py-between-groups">
      <h1 className="m-0 text-page-title font-strong text-headline">{title}</h1>
      {children}
    </main>
  );
}

// The row of a seeker's session, composed here from the markup of `MentorRow`, `BookingStatus` and `TextLink`
// (What is missing: "Row of the seeker's session"). It lives next to this screen until Contributing allows a component.
function SessionRow({ session, timeZone }: { session: SessionItem; timeZone: string }) {
  const { mentor, status, refund, priceMinor, currency, startsAt } = session;
  return (
    <li className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-group">
        <h2 className="m-0 break-words text-body font-strong text-headline">{mentor.name}</h2>
        <p className="m-0 break-words text-body text-foreground">{mentor.headline}</p>
        <p className="m-0 break-words text-label text-muted-foreground">{mentor.technologies.join(' · ')}</p>
        {status === 'accepted' && startsAt ? (
          <p className="m-0 text-label tabular-nums text-foreground">
            {formatDate(startsAt, timeZone)}, {formatClock(startsAt, timeZone)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-group md:items-end">
        <span className="text-body tabular-nums text-headline">{formatPrice(priceMinor, currency)}</span>
        <BookingStatus status={status} viewer="seeker" refund={refund} />
        <TextLink href={`#${session.id}`} className="w-fit text-label">
          Open<span className="sr-only"> the session with {mentor.name}</span>
        </TextLink>
      </div>
    </li>
  );
}

// The skeleton of one row: the lines of a row (name, description, details), three rows.
function SkeletonRow() {
  return (
    <div className="flex flex-col gap-group border-b border-border py-panel-compact last:border-b-0">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function MySessionsView({
  state,
  sessions,
  initialStatus = '',
  refreshFailed = false,
  timeZone = 'UTC',
  onRetry = () => {},
}: {
  state: MySessionsState;
  sessions: SessionItem[];
  /** The chosen status filter. Kept while the list is loading or failed, so it comes back after "Try again". */
  initialStatus?: BookingStatusValue | '';
  /** A reload failed after the list was shown: the last result stays, with an alert above it. */
  refreshFailed?: boolean;
  timeZone?: string;
  onRetry?: () => void;
}) {
  const [status, setStatus] = useState<BookingStatusValue | ''>(initialStatus);
  const clear = () => setStatus('');

  const visible = status ? sessions.filter((session) => session.status === status) : sessions;
  const statusText = status ? bookingStatusLabel(status, 'seeker').text : '';
  const count = `${visible.length} ${visible.length === 1 ? 'session' : 'sessions'}${status ? ` with status ${statusText}` : ''}`;

  return (
    <Page title="My sessions">
      {state === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-between-groups">
          <LoadingMessage message="Loading your sessions…" />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : null}

      {state === 'error' ? <ErrorMessage message="Sessions could not be loaded. Check your connection and try again." onRetry={onRetry} /> : null}

      {state === 'ready' && sessions.length === 0 ? (
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

      {state === 'ready' && sessions.length > 0 ? (
        <>
          {refreshFailed ? (
            <Alert variant="destructive">
              <AlertDescription>The list could not be refreshed. It shows the last result.</AlertDescription>
              <div>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Try again
                </Button>
              </div>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-between-groups">
            <div className="max-w-session">
              <Field label="Status">
                <Select density="compact" value={status} onChange={(event) => setStatus(event.target.value as BookingStatusValue | '')}>
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
              {count}
            </p>
          </div>
          {visible.length === 0 ? (
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
              {visible.map((session) => (
                <SessionRow key={session.id} session={session} timeZone={timeZone} />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Page>
  );
}
