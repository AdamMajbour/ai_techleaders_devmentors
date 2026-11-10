/** @jest-environment node */
import { ConflictError, NotFoundError, ValidationError } from '../../http/errors';
import type { Clock } from '../../utils/clock';
import { AvailabilityService } from './availability.service';

const mentorId = '1c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const slotId = '2c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11';
const now = new Date('2026-11-05T12:00:00.000Z');

function setup(overrides: { isMentor?: boolean; isListed?: boolean; cancelResult?: boolean } = {}) {
  const slot = {
    id: slotId,
    mentorId,
    startsAt: new Date('2026-11-05T13:00:00.000Z'),
    endsAt: new Date('2026-11-05T13:25:00.000Z'),
    status: 'open',
    bookingId: null,
  };
  const repository = {
    create: jest.fn(async () => slot),
    findById: jest.fn(async () => slot),
    findOpenForMentor: jest.fn(async () => [slot]),
    cancelOpen: jest.fn(async () => overrides.cancelResult ?? true),
  };
  const profileRepository = { findById: jest.fn(async () => ({ userId: mentorId, isListed: overrides.isListed ?? true })) };
  const invitations = {
    isPilotMember: jest.fn(async () => true),
    isAcceptedMentor: jest.fn(async () => overrides.isMentor ?? true),
  };
  const clock: Clock = { now: () => new Date(now) };
  return {
    service: new AvailabilityService({
      availabilitySlotRepository: repository as never,
      mentorProfileRepository: profileRepository as never,
      invitationService: invitations,
      clock,
    }),
    repository,
  };
}

describe('AvailabilityService', () => {
  it('publishes UTC 25-minute slots on quarter-hour boundaries within the pilot window', async () => {
    const { service, repository } = setup();
    const dto = await service.create({ userId: mentorId }, { startsAt: '2026-11-05T13:00:00.000Z' });

    expect(repository.create).toHaveBeenCalledWith({
      mentorId,
      startsAt: new Date('2026-11-05T13:00:00.000Z'),
      endsAt: new Date('2026-11-05T13:25:00.000Z'),
    });
    expect(dto.startsAt).toBe('2026-11-05T13:00:00.000Z');
  });

  it.each([
    '2026-11-05T12:15:00.000Z',
    '2026-11-05T12:00:00.000Z',
    '2026-11-12T11:45:00.000Z',
    '2026-11-13T12:00:00.000Z',
  ])('rejects invalid slot start %s', async (startsAt) => {
    const { service, repository } = setup();
    await expect(service.create({ userId: mentorId }, { startsAt })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('only lists slots for a listed mentor', async () => {
    const { service, repository } = setup({ isListed: false });
    await expect(service.list({ userId: 'seeker' }, mentorId)).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findOpenForMentor).not.toHaveBeenCalled();
  });

  it('does not let a mentor withdraw another mentor’s slot', async () => {
    const { service, repository } = setup();
    await expect(service.cancel({ userId: 'other-mentor' }, slotId)).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.cancelOpen).not.toHaveBeenCalled();
  });

  it('reports a concurrent cancellation as a conflict', async () => {
    const { service } = setup({ cancelResult: false });
    await expect(service.cancel({ userId: mentorId }, slotId)).rejects.toBeInstanceOf(ConflictError);
  });
});
