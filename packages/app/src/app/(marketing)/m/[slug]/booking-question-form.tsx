'use client';

import { CURRENCY, SESSION_OPTIONS, type MentorProfileDto } from '@devmentor/core';
import { Alert, AlertDescription, apiCall, Button, Field, formatPrice, LoadingMessage, PriceNotice, QuestionForm, Select, useAsync } from '@devmentor/ui';
import { useState } from 'react';
import { captureBookingAttribution, type BookingSource } from '@/lib/booking-attribution';

type BookingCreated = {
  checkoutUrl: string;
};

type AvailabilitySlot = { id: string; startsAt: string; endsAt: string };
type CurrentTerms = { id: string; version: string; sha256: string; testOnly?: boolean };

export function BookingQuestionForm({
  profile,
  source,
}: {
  profile: MentorProfileDto;
  source: BookingSource;
}) {
  const [durationMinutes, setDurationMinutes] = useState<(typeof SESSION_OPTIONS)[number]['durationMinutes']>(25);
  const [slotId, setSlotId] = useState('');
  const availability = useAsync(
    () => apiCall<AvailabilitySlot[]>(`/api/mentors/${encodeURIComponent(profile.id)}/availability`),
    [profile.id],
  );
  const termsRequest = useAsync(() => apiCall<CurrentTerms | null>('/api/terms/current?kind=seeker'), []);
  const terms = termsRequest.data?.ok ? termsRequest.data.data : null;
  const slots = availability.data?.ok ? availability.data.data : [];
  const selectedSession = SESSION_OPTIONS.find((option) => option.durationMinutes === durationMinutes) ?? SESSION_OPTIONS[0];
  const selectableSlots = slots.filter((slot) =>
    Date.parse(slot.endsAt) - Date.parse(slot.startsAt) >= durationMinutes * 60 * 1000,
  );
  const selectedSlot = selectableSlots.find((slot) => slot.id === slotId);
  const error = availability.error?.message ?? (availability.data && !availability.data.ok ? availability.data.error.message : null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatSlot = (startsAt: string) => new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(startsAt));

  return (
    <section aria-labelledby="ask-mentor" className="flex flex-col gap-group">
      <h2 id="ask-mentor" className="m-0 text-section-title font-strong text-headline">
        Choose a time with {profile.slug}
      </h2>
      <Field label="Session length" requirement="required">
        <Select
          value={String(durationMinutes)}
          onChange={(event) => {
            const nextDuration = Number(event.currentTarget.value) as (typeof SESSION_OPTIONS)[number]['durationMinutes'];
            setDurationMinutes(nextDuration);
            setSlotId('');
          }}
          aria-label="Session length"
        >
          {SESSION_OPTIONS.map((option) => (
            <option key={option.durationMinutes} value={option.durationMinutes}>
              {option.durationMinutes} minutes — {formatPrice(option.priceMinor, CURRENCY)}
            </option>
          ))}
        </Select>
      </Field>
      <PriceNotice amountMinor={selectedSession.priceMinor} currency={CURRENCY} description={`for a ${durationMinutes}-minute text session with ${profile.slug}`} refundRule="If the mentor declines, does not answer, or does not attend, you are refunded." />
      <Field label="Available session time" hint={`Times are shown in your timezone (${timeZone}). Book at least 2 hours before the session.`} error={error ?? undefined} requirement="required">
        <Select value={slotId} onChange={(event) => setSlotId(event.currentTarget.value)} aria-label="Available session time">
          <option value="">Choose a time</option>
          {selectableSlots.map((slot) => <option key={slot.id} value={slot.id}>{formatSlot(slot.startsAt)}</option>)}
        </Select>
      </Field>
      <dl className="m-0 flex flex-col gap-group border-y border-border py-group text-body">
        <div className="flex justify-between gap-group"><dt className="text-muted-foreground">Session length</dt><dd className="m-0 text-right">{durationMinutes} minutes</dd></div>
        <div className="flex justify-between gap-group"><dt className="text-muted-foreground">Session price</dt><dd className="m-0 text-right font-strong tabular-nums">{formatPrice(selectedSession.priceMinor, CURRENCY)}</dd></div>
      </dl>
      {availability.status === 'pending' || availability.status === 'idle' ? <LoadingMessage message="Loading available times…" /> : null}
      {availability.status === 'success' && selectableSlots.length === 0 ? <p className="m-0 text-body text-muted-foreground">{durationMinutes === 50 ? 'No 50-minute sessions are available right now. Choose 25 minutes or check again later.' : 'No session times are available right now. Please check again later.'}</p> : null}
      <section aria-labelledby="booking-summary" className="flex flex-col gap-group border-b border-border pb-group">
        <h3 id="booking-summary" className="m-0 text-label font-strong text-headline">Order summary</h3>
        <dl className="m-0 flex flex-col gap-group text-body">
          <div className="flex justify-between gap-group"><dt className="text-muted-foreground">Mentor</dt><dd className="m-0 text-right">{profile.slug}</dd></div>
          <div className="flex justify-between gap-group"><dt className="text-muted-foreground">Time</dt><dd className="m-0 text-right">{selectedSlot ? formatSlot(selectedSlot.startsAt) : 'Choose a time'}</dd></div>
          <div className="flex justify-between gap-group"><dt className="text-muted-foreground">Text session</dt><dd className="m-0 text-right">{durationMinutes} minutes</dd></div>
          <div className="flex justify-between gap-group"><dt className="font-strong text-headline">Total</dt><dd className="m-0 text-right font-strong tabular-nums text-headline">{formatPrice(selectedSession.priceMinor, CURRENCY)}</dd></div>
        </dl>
      </section>
      {terms ? <>
        {terms.testOnly ? <Alert><AlertDescription>Mock checkout only: no real payment is taken. Published pilot terms are not available in this environment.</AlertDescription></Alert> : null}
        <QuestionForm
        mentorName={profile.slug}
        priceMinor={selectedSession.priceMinor}
        currency={CURRENCY}
        showPriceNotice={false}
        submitLabel={`Confirm booking and pay ${formatPrice(selectedSession.priceMinor, CURRENCY)}`}
        actionBlockedReason={!slotId ? 'Choose a time to continue.' : undefined}
        termsHref="#pilot-booking-terms"
        termsVersionId={terms.id}
        termsSha256={terms.sha256}
        termsHint="Your question is shared with this mentor only. Do not include passwords, tokens, or other secrets."
        consentLabel={terms.testOnly ? 'I understand this is a mock checkout and no real payment will be taken.' : undefined}
        maxLength={4000}
        onSubmit={({ question, acceptedTerms, termsVersionId, termsSha256 }) => {
          const attribution = captureBookingAttribution(profile.slug, source);
          return apiCall<BookingCreated>('/api/bookings', {
            method: 'POST',
            json: {
              mentorId: profile.id,
              availabilitySlotId: slotId,
              durationMinutes,
              question,
              acceptedTerms,
              termsVersionId,
              termsSha256,
              source: attribution?.source ?? source,
              landedAt: attribution?.landedAt ?? new Date().toISOString(),
            },
          });
        }}
        onSuccess={(data) => {
          if (
            typeof data === 'object' &&
            data !== null &&
            'checkoutUrl' in data &&
            typeof data.checkoutUrl === 'string'
          ) {
            window.location.assign(data.checkoutUrl);
          }
        }}
        />
      </> : null}
      {!terms ? <div className="flex flex-col items-start gap-group">
        {termsRequest.status !== 'pending' && termsRequest.status !== 'idle' ? <p role="status" className="m-0 text-body text-muted-foreground">Checkout is unavailable until current reviewed pilot terms are published.</p> : null}
        <Button type="button" disabledReason={termsRequest.status === 'pending' || termsRequest.status === 'idle' ? 'Loading booking terms…' : 'Checkout is unavailable until current reviewed pilot terms are published.'}>
          Confirm booking and pay {formatPrice(selectedSession.priceMinor, CURRENCY)}
        </Button>
      </div> : null}
    </section>
  );
}
