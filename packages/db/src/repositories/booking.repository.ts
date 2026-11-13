import type { EntityManager } from '@mikro-orm/core';
import { Booking } from '../entities';
export class BookingRepository {
 constructor(private readonly em: EntityManager) {}
 findById(id: string) { return this.em.findOne(Booking, { id }); }
 findByParticipant(userId: string) { return this.em.find(Booking, { $or: [{ mentorId: userId }, { seekerId: userId }] }); }
}
