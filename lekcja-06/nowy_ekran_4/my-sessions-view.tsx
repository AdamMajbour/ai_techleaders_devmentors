'use client';

// Exercise screen "My sessions": the seeker's list of sessions with a status filter. Built only from the design
// system (docs/design-system.md, Storybook > Patterns > List with filters, Design system > What is missing).
// The row is composed here from MentorRow markup, BookingStatus and TextLink, because no row component exists yet.
// Data: `GET /api/bookings?role=seeker` (booking spec, API table). The page loads it with `useAsync` and `apiCall`
// and passes `status`, `sessions` and `timeZone` to this view; the filter lives here, so a failed load does not reset it.
import { X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import {
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

export interface SessionRowData {
  id: string;
  /** The mentor's card as `GET /api/bookings` sends it. `headline` is the mentor's specialization. */
  mentor: { id: string; name: string; headline: string; technologies: string[] };
  status: BookingStatusValue;
  refund?: RefundState;
  /** The price of this booking (what was charged), not the mentor's current price. */
  priceMinor: number;
  currency: string;
  /** Only for an accepted booking. */
  startsAt?: string;
}

export type SessionsLoadState = 'loading' | 'ready' | 'error';

// There is no runtime list of the statuses: `BookingStatusValue` is only a type. The order is the order of the type.
const STATUSES: BookingStatusValue[] = ['pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired'];

type StatusFilter = '' | BookingStatusValue;

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-between-groups py-between-groups">
      <h1 className="m-0 text-page-title font-strong text-headline">{title}</h1>
      {children}
    </main>
  );
}

function SessionRow({ session, timeZone }: { session: SessionRowData; timeZone: string }) {
  const { mentor, status, refund, priceMinor, currency, startsAt } = session;
  return (
    <li className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-group">
        <h2 className="m-0 break-words text-body font-strong text-headline">{mentor.name}</h2>
        <p className="m-0 break-words text-body text-foreground">{mentor.headline}</p>
        {mentor.technologies.length > 0 ? (
          <p className="m-0 break-words text-label text-muted-foreground">{mentor.technologies.join(' · ')}</p>
        ) : null}
        {status === 'accepted' && startsAt ? (
          <p className="m-0 text-label tabular-nums text-foreground">
            {formatDate(startsAt, timeZone)}, {formatClock(startsAt, timeZone)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-group md:items-end">
        <BookingStatus status={status} viewer="seeker" refund={refund} />
        <p className="m-0 text-body font-strong tabular-nums text-headline">{formatPrice(priceMinor, currency)}</p>
        <TextLink href={`#${session.id}`} className="w-fit text-label">
          Open<span className="sr-only"> the session with {mentor.name}</span>
        </TextLink>
      </div>
    </li>
  );
}

export function MySessionsView({
  status,
  sessions,
  timeZone,
  onRetry,
  initialFilter = '',
}: {
  status: SessionsLoadState;
  sessions: SessionRowData[];
  /** IANA name from the seeker's profile. */
  timeZone: string;
  onRetry?: () => void;
  initialFilter?: StatusFilter;
}) {
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);
  const selectRef = useRef<HTMLSelectElement>(null);
  const clear = () => {
    setFilter('');
    selectRef.current?.focus();
  };

  const shown = filter ? sessions.filter((session) => session.status === filter) : sessions;
  const filterLabel = filter ? bookingStatusLabel(filter, 'seeker').text : '';
  const hasItems = status === 'ready' && sessions.length > 0;

  return (
    <Page title="My sessions">
      {status === 'loading' ? (
        <div aria-busy="true" className="flex flex-col">
          <LoadingMessage message="Loading your sessions…" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-group border-b border-border py-panel-compact">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {status === 'error' ? (
        <ErrorMessage message="Sessions could not be loaded. Check your connection and try again." onRetry={onRetry} />
      ) : null}

      {status === 'ready' && sessions.length === 0 ? (
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

      {hasItems ? (
        <div className="flex flex-col gap-between-groups">
          <div className="max-w-session">
            <Field label="Status">
              <Select
                ref={selectRef}
                density="compact"
                value={filter}
                onChange={(event) => setFilter(event.target.value as StatusFilter)}
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
          <p role="status" aria-live="polite" className="m-0 text-label text-muted-foreground">
            {shown.length === 1 ? '1 session' : `${shown.length} sessions`}
            {filter ? ` with status "${filterLabel}"` : ''}
          </p>
          {filter ? (
            <div className="flex flex-wrap items-center gap-group">
              <Button variant="outline" size="sm" onClick={clear}>
                Status: {filterLabel}
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

      {hasItems && shown.length === 0 ? (
        <EmptyState
          title={`No sessions with status "${filterLabel}"`}
          description="No session has this status. Choose another status or clear the filter."
          action={
            <Button variant="outline" onClick={clear}>
              Clear filter
            </Button>
          }
        />
      ) : null}

      {hasItems && shown.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((session) => (
            <SessionRow key={session.id} session={session} timeZone={timeZone} />
          ))}
        </ul>
      ) : null}
    </Page>
  );
}
