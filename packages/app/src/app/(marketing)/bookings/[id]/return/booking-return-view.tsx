'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BookingReadDto } from '@devmentor/core';
import { apiCall } from '@devmentor/ui';
import {
  Alert,
  AlertDescription,
  BookingStatus,
  ErrorMessage,
  LoadingMessage,
  TextLink,
  usePolling,
} from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';

type PollResult = { booking: BookingReadDto; terminal: boolean };
type ReturnState = 'polling' | 'reconciling';

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

function isTerminal(status: string): boolean {
  return status === 'paid' || status === 'accepted' || status === 'payment_failed';
}

export function BookingReturnView({ bookingId }: { bookingId: string }) {
  const [phase, setPhase] = useState<ReturnState>('polling');
  const [retryNumber, setRetryNumber] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setPhase('reconciling'), 60_000);
    return () => clearTimeout(timer);
  }, [bookingId]);

  const fetchBooking = useCallback(async (cursor: string): Promise<PollResult> => {
    const [id] = cursor.split(':');
    const result = phase === 'reconciling'
      ? await apiCall<BookingReadDto>(
          `/api/bookings/${encodeURIComponent(id)}/reconcile-payment`,
          { method: 'POST', json: {} },
        )
      : await apiCall<BookingReadDto>(
          `/api/bookings/${encodeURIComponent(id)}`,
        );
    const booking = unwrap(result);
    return { booking, terminal: isTerminal(booking.status) };
  }, [phase]);

  const cursor = `${bookingId}:${phase}:${retryNumber}`;
  const polling = usePolling({
    fetcher: fetchBooking,
    intervalMs: phase === 'polling' ? 3_000 : 30_000,
    cursor,
  });
  const booking = polling.data?.booking;

  if (!booking && polling.status === 'error') {
    return (
      <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-compact">
        <h1 className="m-0 text-page-title font-strong text-headline">Payment status</h1>
        <ErrorMessage message={polling.error?.message ?? 'Payment status could not be loaded.'} onRetry={() => setRetryNumber((value) => value + 1)} />
      </main>
    );
  }
  if (!booking) {
    return (
      <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-compact" aria-busy="true">
        <h1 className="m-0 text-page-title font-strong text-headline">Payment status</h1>
        <LoadingMessage />
      </main>
    );
  }

  const retryLink = booking.mentor?.slug
    ? `/m/${encodeURIComponent(booking.mentor.slug)}?source=${booking.source ?? 'link'}`
    : '/mentors';

  return (
    <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-compact" aria-live="polite">
      <h1 className="m-0 text-page-title font-strong text-headline">Payment status</h1>
      {polling.error ? (
        <Alert variant="destructive">
          <AlertDescription>We could not check the payment just now. We will keep trying. {polling.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {booking.status === 'paid' || booking.status === 'accepted' ? (
        <>
          <BookingStatus status={booking.status} viewer="seeker" />
          <p className="m-0 text-body text-foreground">Payment received. Your question has been sent to the mentor.</p>
        </>
      ) : booking.status === 'payment_failed' ? (
        <>
          <BookingStatus status="payment_failed" viewer="seeker" />
          <Alert variant="destructive">
            <AlertDescription>Payment did not complete. This booking was not paid. You can try again with a new question.</AlertDescription>
          </Alert>
          <TextLink href={retryLink}>Return to the mentor profile</TextLink>
        </>
      ) : booking.status === 'pending_payment' ? (
        <>
          <BookingStatus status="pending_payment" viewer="seeker" />
          <p role="status" className="m-0 text-body text-foreground">
            Payment is still pending. {phase === 'polling' ? 'We are checking for an update.' : 'We are checking the payment provider.'}
          </p>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertDescription>We could not determine the payment outcome. Refresh this page or contact support.</AlertDescription>
        </Alert>
      )}
    </main>
  );
}
