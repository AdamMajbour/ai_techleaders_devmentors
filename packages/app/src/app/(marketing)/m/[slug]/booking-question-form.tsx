'use client';

import { CURRENCY, SESSION_25_PRICE_MINOR, type MentorProfileDto } from '@devmentor/core';
import { apiCall, QuestionForm } from '@devmentor/ui';
import { captureBookingAttribution, type BookingSource } from '@/lib/booking-attribution';

type BookingCreated = {
  checkoutUrl: string;
};

export function BookingQuestionForm({
  profile,
  source,
}: {
  profile: MentorProfileDto;
  source: BookingSource;
}) {
  return (
    <section aria-labelledby="ask-mentor" className="flex flex-col gap-group">
      <h2 id="ask-mentor" className="m-0 text-section-title font-strong text-headline">
        Ask {profile.slug}
      </h2>
      <QuestionForm
        mentorName={profile.slug}
        priceMinor={SESSION_25_PRICE_MINOR}
        currency={CURRENCY}
        termsHref="#pilot-booking-terms"
        termsHint="Your question is shared with this mentor only. Do not include passwords, tokens, or other secrets."
        maxLength={4000}
        onSubmit={({ question }) => {
          const attribution = captureBookingAttribution(profile.slug, source);
          return apiCall<BookingCreated>('/api/bookings', {
            method: 'POST',
            json: {
              mentorId: profile.id,
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
      />
    </section>
  );
}
