import { isExclusionConstraintViolation, isUniqueConstraintViolation, StatusTransitionConflictError, type AvailabilitySlot, type AvailabilitySlotRepository, type MentorProfileRepository } from '@devmentor/db';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import { parseOrThrow } from '../../validators/parse';
import { availabilitySlotCreateSchema } from '../../validators/bookings/availability-slot.schema';
import type { InvitationService } from '../auth/invitation.service';

type Dependencies = {
  availabilitySlotRepository: AvailabilitySlotRepository;
  mentorProfileRepository: MentorProfileRepository;
  invitationService: Pick<InvitationService, 'isAcceptedMentor' | 'isPilotMember'>;
  clock: Clock;
};

export interface AvailabilitySlotDto {
  id: string;
  startsAt: string;
  endsAt: string;
}

const MIN_LEAD_MS = 30 * 60 * 1000;
const MIN_BOOKING_LEAD_MS = 2 * 60 * 60 * 1000;
const MAX_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;
const QUARTER_HOUR_MS = 15 * 60 * 1000;

function toDto(slot: AvailabilitySlot): AvailabilitySlotDto {
  return { id: slot.id, startsAt: slot.startsAt.toISOString(), endsAt: slot.endsAt.toISOString() };
}

export class AvailabilityService {
  private readonly availabilitySlotRepository: AvailabilitySlotRepository;
  private readonly mentorProfileRepository: MentorProfileRepository;
  private readonly invitationService: Dependencies['invitationService'];
  private readonly clock: Clock;

  constructor({ availabilitySlotRepository, mentorProfileRepository, invitationService, clock }: Dependencies) {
    this.availabilitySlotRepository = availabilitySlotRepository;
    this.mentorProfileRepository = mentorProfileRepository;
    this.invitationService = invitationService;
    this.clock = clock;
  }

  async list(session: Session, mentorId: string): Promise<AvailabilitySlotDto[]> {
    await this.requireMember(session);
    const profile = await this.mentorProfileRepository.findById(mentorId);
    if (!profile || !profile.isListed || !(await this.invitationService.isAcceptedMentor(profile.userId))) {
      throw new NotFoundError('Mentor profile not found.');
    }
    const now = this.clock.now();
    const slots = await this.availabilitySlotRepository.findOpenForMentor(
      profile.userId,
      new Date(now.getTime() + MIN_BOOKING_LEAD_MS),
      new Date(now.getTime() + MAX_AHEAD_MS),
    );
    return slots.map(toDto);
  }

  async listOwn(session: Session): Promise<AvailabilitySlotDto[]> {
    await this.requireMentor(session);
    const now = this.clock.now();
    const slots = await this.availabilitySlotRepository.findOpenForMentor(
      session.userId,
      now,
      new Date(now.getTime() + MAX_AHEAD_MS),
    );
    return slots.map(toDto);
  }

  async create(session: Session, untrustedInput: unknown): Promise<AvailabilitySlotDto> {
    await this.requireMember(session);
    await this.requireMentor(session);
    const input = parseOrThrow(availabilitySlotCreateSchema, untrustedInput);
    const startsAt = new Date(input.startsAt);
    const now = this.clock.now();
    const delta = startsAt.getTime() - now.getTime();
    if (
      startsAt.getTime() % QUARTER_HOUR_MS !== 0 ||
      delta < MIN_LEAD_MS ||
      delta + input.durationMinutes * 60 * 1000 > MAX_AHEAD_MS
    ) {
      throw new ValidationError('Choose a 25- or 50-minute session at least 30 minutes from now and within the next 7 days.', {
        startsAt: ['Start must align to a 15-minute boundary and the full session must fit within the next 7 days.'],
      });
    }
    try {
      const slot = await this.availabilitySlotRepository.create({
        mentorId: session.userId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + input.durationMinutes * 60 * 1000),
      });
      return toDto(slot);
    } catch (error) {
      if (error instanceof StatusTransitionConflictError || isUniqueConstraintViolation(error) || isExclusionConstraintViolation(error)) {
        throw new ConflictError('That time overlaps another available slot.');
      }
      throw error;
    }
  }

  async cancel(session: Session, slotId: string): Promise<{ cancelled: true }> {
    await this.requireMember(session);
    await this.requireMentor(session);
    const slot = await this.availabilitySlotRepository.findById(slotId);
    if (!slot || slot.mentorId !== session.userId) throw new NotFoundError('Availability slot not found.');
    if (slot.status !== 'open') throw new ConflictError('A reserved time cannot be cancelled. Decline its booking instead.');
    if (!(await this.availabilitySlotRepository.cancelOpen(slotId, session.userId))) throw new ConflictError();
    return { cancelled: true };
  }

  private async requireMember(session: Session): Promise<void> {
    if (!session?.userId) throw new UnauthorizedError();
    if (!(await this.invitationService.isPilotMember(session.userId))) throw new ForbiddenError();
  }

  private async requireMentor(session: Session): Promise<void> {
    if (!session?.userId) throw new UnauthorizedError();
    if (!(await this.invitationService.isAcceptedMentor(session.userId))) throw new NotFoundError();
  }
}
