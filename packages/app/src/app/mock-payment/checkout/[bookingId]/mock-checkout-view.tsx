'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiCall, Alert, AlertDescription, Button, ErrorMessage, LoadingMessage, PriceNotice, TextLink, useAsync } from '@devmentor/ui';
import type { BookingReadDto } from '@devmentor/core';

export function MockCheckoutView({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [requestNumber, setRequestNumber] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const request = useAsync(
    () => apiCall<BookingReadDto>(`/api/bookings/${encodeURIComponent(bookingId)}`),
    [bookingId, requestNumber],
  );

  if (request.status === 'idle' || request.status === 'pending') {
    return <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-compact" aria-busy="true"><LoadingMessage /></main>;
  }
  if (request.error || !request.data || !request.data.ok) {
    const message = request.error?.message ??
      (request.data && !request.data.ok ? request.data.error.message : 'This checkout could not be loaded.');
    return (
      <main className="mx-auto max-w-session p-panel-compact">
        <ErrorMessage
          message={message}
          onRetry={() => setRequestNumber((number) => number + 1)}
        />
      </main>
    );
  }

  const booking = request.data.data;
  const finish = async (outcome: 'complete' | 'fail') => {
    setSubmitting(true);
    setActionError(undefined);
    const result = await apiCall<BookingReadDto>(`/api/bookings/${encodeURIComponent(bookingId)}/mock-payment`, {
      method: 'POST',
      json: { outcome },
    });
    setSubmitting(false);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    router.push(`/bookings/${encodeURIComponent(bookingId)}/return`);
  };

  return (
    <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-compact">
      <h1 className="m-0 text-page-title font-strong text-headline">Local mock checkout</h1>
      <Alert>
        <AlertDescription>This development checkout never charges a card or contacts a payment provider.</AlertDescription>
      </Alert>
      <PriceNotice
        amountMinor={booking.priceMinor}
        currency={booking.currency}
        description={`for a ${booking.durationMinutes}-minute text session`}
        refundRule="This is a local test payment. No real money is charged."
      />
      {booking.status !== 'pending_payment' ? (
        <p role="status" className="m-0 text-body text-foreground">This checkout is already {booking.status.replaceAll('_', ' ')}.</p>
      ) : (
        <div className="flex flex-wrap gap-group">
          <Button disabled={submitting} onClick={() => void finish('complete')}>
            {submitting ? 'Completing…' : 'Complete test payment'}
          </Button>
          <Button variant="outline" disabled={submitting} onClick={() => void finish('fail')}>
            Fail test payment
          </Button>
        </div>
      )}
      {actionError ? (
        <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert>
      ) : null}
      <TextLink href="/mentors">Abandon checkout and return to mentors</TextLink>
    </main>
  );
}
