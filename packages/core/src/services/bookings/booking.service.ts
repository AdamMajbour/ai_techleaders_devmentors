import type { BookingRepository } from '@devmentor/db';
import type { Session } from '../../security/session';
export class BookingService {
 constructor(private readonly deps: { bookingRepository: BookingRepository }) {}
 async listForParticipant(session: Session) {
  return (await this.deps.bookingRepository.findByParticipant(session.userId)).filter((b) => ['accepted','completed'].includes(b.status));
 }
 async getForNote(session: Session, id: string) {
  const booking = await this.deps.bookingRepository.findById(id);
  if (!booking || !['accepted','completed'].includes(booking.status) || (booking.mentorId !== session.userId && booking.seekerId !== session.userId)) return null;
  return booking;
 }
}
