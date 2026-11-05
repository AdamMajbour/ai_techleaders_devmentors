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
