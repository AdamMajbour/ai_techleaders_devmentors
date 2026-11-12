'use client';

import { CURRENCY, SESSION_25_PRICE_MINOR, type MentorProfileDto } from '@devmentor/core';
import { apiCall, Field, LoadingMessage, PriceNotice, QuestionForm, Select, useAsync } from '@devmentor/ui';
import { useState } from 'react';
import { captureBookingAttribution, type BookingSource } from '@/lib/booking-attribution';

type BookingCreated = {
  checkoutUrl: string;
};

type AvailabilitySlot = { id: string; startsAt: string; endsAt: string };

export function BookingQuestionForm({
  profile,
  source,
}: {
  profile: MentorProfileDto;
  source: BookingSource;
}) {
  const [slotId, setSlotId] = useState('');
  const availability = useAsync(
    () => apiCall<AvailabilitySlot[]>(`/api/mentors/${encodeURIComponent(profile.id)}/availability`),
    [profile.id],
  );
  const slots = availability.data?.ok ? availability.data.data : [];
  const error = availability.error?.message ?? (availability.data && !availability.data.ok ? availability.data.error.message : null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatSlot = (startsAt: string) => new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(startsAt));

  return (
    <section aria-labelledby="ask-mentor" className="flex flex-col gap-group">
      <h2 id="ask-mentor" className="m-0 text-section-title font-strong text-headline">
        Ask {profile.slug}
      </h2>
      <PriceNotice amountMinor={SESSION_25_PRICE_MINOR} currency={CURRENCY} description={`for a 25-minute text session with ${profile.slug}`} refundRule="If the mentor declines, does not answer, or does not attend, you are refunded." />
      <Field label="Available session time" hint={`Times are shown in your timezone (${timeZone}). Sessions last 25 minutes.`} error={error ?? undefined} requirement="required">
        <Select value={slotId} onChange={(event) => setSlotId(event.currentTarget.value)} aria-label="Available session time">
          <option value="">Choose a time</option>
          {slots.map((slot) => <option key={slot.id} value={slot.id}>{formatSlot(slot.startsAt)}</option>)}
        </Select>
      </Field>
      {availability.status === 'pending' || availability.status === 'idle' ? <LoadingMessage message="Loading available times…" /> : null}
      {availability.status === 'success' && slots.length === 0 ? <p className="m-0 text-body text-muted-foreground">No session times are available right now. Please check again later.</p> : null}
      {slotId ? <QuestionForm
        mentorName={profile.slug}
        priceMinor={SESSION_25_PRICE_MINOR}
        currency={CURRENCY}
        showPriceNotice={false}
        termsHref="#pilot-booking-terms"
        termsHint="Your question is shared with this mentor only. Do not include passwords, tokens, or other secrets."
        maxLength={4000}
        onSubmit={({ question }) => {
          const attribution = captureBookingAttribution(profile.slug, source);
          return apiCall<BookingCreated>('/api/bookings', {
            method: 'POST',
            json: {
              mentorId: profile.id,
              availabilitySlotId: slotId,
              question,
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
      /> : null}
    </section>
  );
}
