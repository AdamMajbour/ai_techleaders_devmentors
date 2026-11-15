/** @jest-environment node */
import { InvitationService } from './invitation.service';

const createdInvitation = {
  id: 'invitation-1',
  email: 'ada@example.com',
  displayName: 'Ada',
  role: 'mentor',
  invitedBy: null,
  acceptedByUserId: null,
  acceptedAt: null,
  revokedAt: null,
};

describe('InvitationService', () => {
  it('includes accepted outreach invitations in mentor eligibility without changing other role checks', async () => {
    const invitationRepository = {
      hasAcceptedRole: jest.fn(async () => false),
      isPilotMember: jest.fn(async () => true),
    };
    const mentorInvitationRepository = { hasAcceptedMentor: jest.fn(async () => true) };
    const service = new InvitationService({
      invitationRepository: invitationRepository as never,
      mentorInvitationRepository,
    });

    await expect(service.isAcceptedMentor('mentor-id')).resolves.toBe(true);
    expect(await service.isPilotMember('mentor-id')).toBe(true);
    expect(invitationRepository.hasAcceptedRole).toHaveBeenCalledWith('mentor-id', 'mentor');
    expect(mentorInvitationRepository.hasAcceptedMentor).toHaveBeenCalledWith('mentor-id');
  });

  it('normalizes e-mail and trims the display name when creating an invitation', async () => {
    const invitationRepository = {
      create: jest.fn(async () => createdInvitation),
    };
    const service = new InvitationService({ invitationRepository: invitationRepository as never });

    await expect(
      service.invite({ email: ' Ada@Example.COM ', displayName: ' Ada ', role: 'mentor' }),
    ).resolves.toMatchObject({ email: 'ada@example.com', displayName: 'Ada' });
    expect(invitationRepository.create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      displayName: 'Ada',
      role: 'mentor',
      invitedBy: null,
      acceptedByUserId: null,
      acceptedAt: null,
      revokedAt: null,
    });
  });

  it('requires an accepted, unrevoked invitation for pilot membership', async () => {
    const invitationRepository = { isPilotMember: jest.fn(async () => false) };
    const service = new InvitationService({ invitationRepository: invitationRepository as never });

    await expect(service.isPilotMember('not-accepted')).resolves.toBe(false);
    invitationRepository.isPilotMember.mockResolvedValueOnce(true);
    await expect(service.isPilotMember('accepted')).resolves.toBe(true);
    expect(invitationRepository.isPilotMember).toHaveBeenCalledWith('accepted');
  });

  it('checks mentor eligibility separately without changing pilot membership semantics', async () => {
    const invitationRepository = {
      hasAcceptedRole: jest.fn(async () => false),
      isPilotMember: jest.fn(async () => true),
    };
    const service = new InvitationService({ invitationRepository: invitationRepository as never });

    await expect(service.isAcceptedMentor('seeker-id')).resolves.toBe(false);
    await expect(service.isPilotMember('seeker-id')).resolves.toBe(true);
    invitationRepository.hasAcceptedRole.mockResolvedValueOnce(true);
    await expect(service.isAcceptedMentor('mentor-id')).resolves.toBe(true);
    expect(invitationRepository.hasAcceptedRole).toHaveBeenNthCalledWith(1, 'seeker-id', 'mentor');
    expect(invitationRepository.hasAcceptedRole).toHaveBeenNthCalledWith(2, 'mentor-id', 'mentor');
  });

  it('does not make revoked invitations eligible for login links', async () => {
    const invitationRepository = { findUnrevokedByEmail: jest.fn(async () => null) };
    const service = new InvitationService({ invitationRepository: invitationRepository as never });

    await expect(service.findUnrevokedByEmail('ADA@example.com')).resolves.toBeNull();
    expect(invitationRepository.findUnrevokedByEmail).toHaveBeenCalledWith('ada@example.com');
  });

  it('lists invitations including accepted user ids for operator bootstrap', async () => {
    const invitationRepository = {
      findAll: jest.fn(async () => [
        { ...createdInvitation, acceptedByUserId: 'user-id', acceptedAt: new Date('2026-11-05T12:00:00Z') },
      ]),
    };
    const service = new InvitationService({ invitationRepository: invitationRepository as never });

    await expect(service.list()).resolves.toMatchObject([
      { email: 'ada@example.com', acceptedByUserId: 'user-id', role: 'mentor' },
    ]);
  });
});
