import type { MailEventRegistrar } from './mail-subscriber';

export interface BookingMailDataLoader {
  paidQuestion(bookingId: string): Promise<{ to: string; question: string } | null>;
  acceptedBooking(bookingId: string): Promise<{ to: string; mentorName: string; startsAt: string; durationMinutes: number } | null>;
}

export function registerBookingMailMappings(
  onMail: MailEventRegistrar,
  loader: BookingMailDataLoader,
): void {
  onMail('bookings.booking.paid', async ({ bookingId }) => {
    const data = await loader.paidQuestion(bookingId);
    return data ? { to: data.to, template: 'booking-question', data: { question: data.question } } : null;
  });
  onMail('bookings.booking.accepted', async ({ bookingId }) => {
    const data = await loader.acceptedBooking(bookingId);
    return data
      ? {
          to: data.to,
          template: 'booking-accepted',
          data: { mentorName: data.mentorName, startsAt: data.startsAt, durationMinutes: data.durationMinutes },
        }
      : null;
  });
}
