'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { FilterBar } from '../backend/filters';
import { EmptyState } from '../backend/feedback/EmptyState';
import { ErrorMessage } from '../backend/feedback/ErrorMessage';
import { LoadingMessage } from '../backend/feedback/LoadingMessage';
import { Page } from '../backend/layout/Page';
import {
  bookingStatusLabel,
  type BookingStatusValue,
  type SessionRowData,
  SessionRow,
} from '../components/bookings';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

export type MySessionsState = 'loading' | 'ready' | 'empty' | 'error';

const STATUSES: BookingStatusValue[] = [
  'pending_payment',
  'payment_failed',
  'paid',
  'accepted',
  'declined',
  'expired',
];

export function MySessionsView({
  state,
  sessions,
  timeZone,
  initialStatus = '',
  hrefForSession = (id) => `#${id}`,
  headerAction,
  onRetry,
}: {
  state: MySessionsState;
  sessions: SessionRowData[];
  timeZone: string;
  initialStatus?: BookingStatusValue | '';
  hrefForSession?: (sessionId: string) => string;
  headerAction?: ReactNode;
  onRetry?: () => void;
}) {
  const [status, setStatus] = useState<BookingStatusValue | ''>(initialStatus);
  const shown = status ? sessions.filter((session) => session.status === status) : sessions;
  const selectedStatus = status ? bookingStatusLabel(status, 'seeker').text : '';

  return (
    <Page title="My sessions" headerAction={headerAction}>
      {state === 'loading' ? (
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

      {state === 'error' ? (
        <ErrorMessage
          message="Sessions could not be loaded. Check your connection and try again."
          onRetry={onRetry}
        />
      ) : null}

      {state === 'empty' ? (
        <EmptyState
          title="No sessions yet"
          description="Sessions you book will appear here."
        />
      ) : null}

      {state === 'ready' ? (
        <>
          {sessions.length > 0 ? (
            <FilterBar
              label="Status"
              allLabel="All statuses"
              options={STATUSES.map((value) => ({
                value,
                label: bookingStatusLabel(value, 'seeker').text,
              }))}
              value={status}
              onChange={(value) => setStatus(STATUSES.find((candidate) => candidate === value) ?? '')}
              count={shown.length}
              noun={{ one: 'session', many: 'sessions' }}
              phrase={(label) => `with status "${label}"`}
            />
          ) : null}

          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              description="Sessions you book will appear here."
            />
          ) : shown.length === 0 && status ? (
            <EmptyState
              title={`No sessions with status "${selectedStatus}"`}
              description="No session has this status. Choose another status or clear the filter."
              action={
                <Button variant="outline" onClick={() => setStatus('')}>
                  Clear filter
                </Button>
              }
            />
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {shown.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  timeZone={timeZone}
                  href={hrefForSession(session.id)}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Page>
  );
}
