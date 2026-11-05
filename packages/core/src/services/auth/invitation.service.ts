import { isUniqueConstraintViolation, type InvitationRepository } from '@devmentor/db';
import { ConflictError } from '../../http/errors';

export type InvitationRole = 'seeker' | 'mentor';

export interface InviteInput {
  email: string;
  displayName: string;
  role: InvitationRole;
  invitedBy?: string | null;
}

export interface InvitationDto {
  id: string;
  email: string;
  displayName: string;
  role: InvitationRole;
  invitedBy: string | null;
  acceptedByUserId: string | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toInvitationDto(invitation: Awaited<ReturnType<InvitationRepository['findByEmail']>>): InvitationDto | null {
  if (!invitation) return null;
  return {
    id: invitation.id,
    email: invitation.email,
    displayName: invitation.displayName,
    role: invitation.role as InvitationRole,
    invitedBy: invitation.invitedBy ?? null,
    acceptedByUserId: invitation.acceptedByUserId ?? null,
    acceptedAt: invitation.acceptedAt ?? null,
    revokedAt: invitation.revokedAt ?? null,
  };
}

export class InvitationService {
  private readonly invitationRepository: InvitationRepository;

  constructor({ invitationRepository }: { invitationRepository: InvitationRepository }) {
    this.invitationRepository = invitationRepository;
  }

  async invite(input: InviteInput): Promise<InvitationDto> {
    const email = normalizeInvitationEmail(input.email);
    try {
      const invitation = await this.invitationRepository.create({
        email,
        displayName: input.displayName.trim(),
        role: input.role,
        invitedBy: input.invitedBy ?? null,
        acceptedByUserId: null,
        acceptedAt: null,
        revokedAt: null,
      });
      return toInvitationDto(invitation)!;
    } catch (error) {
      if (isUniqueConstraintViolation(error)) throw new ConflictError('An invitation already exists for this e-mail.');
      throw error;
    }
  }

  async findUnrevokedByEmail(email: string): Promise<InvitationDto | null> {
    return toInvitationDto(
      await this.invitationRepository.findUnrevokedByEmail(normalizeInvitationEmail(email)),
    );
  }

  async list(): Promise<InvitationDto[]> {
    return (await this.invitationRepository.findAll()).map((invitation) => toInvitationDto(invitation)!);
  }

  async acceptForUser(email: string, userId: string, acceptedAt: Date): Promise<boolean> {
    const invitation = await this.findUnrevokedByEmail(email);
    if (!invitation) return false;
    if (invitation.acceptedByUserId) return invitation.acceptedByUserId === userId && invitation.acceptedAt !== null;
    return this.invitationRepository.accept(invitation.email, userId, acceptedAt);
  }

  async revoke(email: string, revokedAt: Date): Promise<boolean> {
    return this.invitationRepository.revoke(normalizeInvitationEmail(email), revokedAt);
  }

  isPilotMember(userId: string): Promise<boolean> {
    return this.invitationRepository.isPilotMember(userId);
  }

  isAcceptedMentor(userId: string): Promise<boolean> {
    return this.invitationRepository.hasAcceptedRole(userId, 'mentor');
  }
}
