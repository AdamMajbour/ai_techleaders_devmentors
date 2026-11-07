'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { BookingPage, BookingReadDto } from '@devmentor/core';
import {
  Alert,
  AlertDescription,
  BookingStatus,
  Button,
  EmptyState,
  ErrorMessage,
  Field,
  Input,
  LoadingMessage,
  TextLink,
  apiCall,
  useAsync,
} from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';

function messageFrom<T>(result: ApiResult<T>): string | null {
  return result.ok ? null : result.error.message;
}

export function MentorBookingsView() {
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  const [startTimes, setStartTimes] = useState<Record<string, string>>({});
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const list = useAsync(
    () => apiCall<BookingPage>(`/api/bookings?role=mentor&page=${page}`),
    [page, reloads],
  );
  const result = list.data;
  const bookings = result?.ok ? result.data : undefined;
  const error = result ? messageFrom(result) : list.error?.message ?? null;

  async function act(booking: BookingReadDto, action: 'accept' | 'decline') {
    setBusyBookingId(booking.id);
    setActionError(null);
    try {
      const startsAt = startTimes[booking.id];
      const body = action === 'accept' && startsAt
        ? { startsAt: new Date(startsAt).toISOString() }
        : {};
      const response = await apiCall<BookingReadDto>(
        `/api/bookings/${encodeURIComponent(booking.id)}/${action}`,
        { method: 'POST', json: body },
      );
      if (!response.ok) {
        setActionError(response.error.message);
        return;
      }
      setReloads((value) => value + 1);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'The booking could not be updated.');
    } finally {
      setBusyBookingId(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-wrap items-start justify-between gap-group">
        <div className="flex flex-col gap-group">
          <h1 className="m-0 text-page-title font-strong text-headline">Bookings</h1>
          <p className="m-0 text-body text-muted-foreground">Review paid questions and choose which sessions to accept.</p>
        </div>
        <div className="flex flex-wrap items-center gap-group">
          <TextLink asChild>
            <Link href="/mentor/profile">Edit mentor profile</Link>
          </TextLink>
        </div>
      </header>

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {bookings?.items.length ? (
        <>
          <ol className="m-0 list-none p-0">
            {bookings.items.map((booking) => (
              <li key={booking.id} className="flex flex-col gap-between-groups border-b border-border py-section">
                {booking.question ? (
                  <section aria-label="Question" className="flex flex-col gap-group">
                    <h2 className="m-0 text-section-title font-strong text-headline">Question</h2>
                    <p className="m-0 whitespace-pre-wrap text-body text-foreground">{booking.question}</p>
                  </section>
                ) : null}
                <div className="flex flex-wrap items-center gap-group">
                  <BookingStatus status={booking.status} viewer="mentor" />
                  <span className="text-body text-foreground">{booking.counterpartName}</span>
                </div>
                {booking.status === 'accepted' && booking.startsAt ? (
                  <p className="m-0 text-body text-foreground">
                    Starts {new Date(booking.startsAt).toLocaleString()}
                  </p>
                ) : null}
                {booking.allowedActions.includes('accept') || booking.allowedActions.includes('decline') ? (
                  <div className="flex flex-col items-start gap-between-groups">
                    <Field label="Session start (optional; defaults to now)">
                      <Input
                        type="datetime-local"
                        value={startTimes[booking.id] ?? ''}
                        onChange={(event) => setStartTimes((value) => ({
                          ...value,
                          [booking.id]: event.currentTarget.value,
                        }))}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-group">
                      {booking.allowedActions.includes('accept') ? (
                        <Button
                          size="sm"
                          disabled={busyBookingId === booking.id}
                          onClick={() => act(booking, 'accept')}
                        >
                          Accept
                        </Button>
                      ) : null}
                      {booking.allowedActions.includes('decline') ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyBookingId === booking.id}
                          onClick={() => act(booking, 'decline')}
                        >
                          Decline
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          {bookings.pageCount > 1 ? (
            <nav aria-label="Booking pages" className="flex items-center justify-between gap-group">
              <Button
                variant="outline"
                size="sm"
                disabled={bookings.page <= 1}
                onClick={() => setPage(bookings.page - 1)}
              >
                Previous
              </Button>
              <span className="text-meta text-muted-foreground">
                Page {bookings.page} of {bookings.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={bookings.page >= bookings.pageCount}
                onClick={() => setPage(bookings.page + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      ) : list.status === 'idle' || list.status === 'pending' ? (
        <LoadingMessage />
      ) : error ? (
        <ErrorMessage message={error} onRetry={() => setReloads((value) => value + 1)} />
      ) : (
        <EmptyState
          title="No paid bookings yet"
          description="Paid questions from seekers will appear here."
        />
      )}
    </main>
  );
}
