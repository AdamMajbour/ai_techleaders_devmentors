import { isUniqueConstraintViolation, type UserRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { ConflictError, UnauthorizedError } from '../../http/errors';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../security/password';
import type { Clock } from '../../utils/clock';
import type { Logger } from '../../logger';
import type { LoginInput } from '../../validators/auth/login.schema';
import type { RegisterInput } from '../../validators/auth/register.schema';
import { toUserDto, type UserDto } from '../dto';
import type { InvitationService } from './invitation.service';
import type { MentorService } from '../mentors/mentor.service';
import { INVALID_MAGIC_LINK_MESSAGE } from './magic-link.constants';
import type { MentorInvitationService } from '../invitations/mentor-invitation.service';

type Dependencies = {
  userRepository: UserRepository;
  eventBus: EventBus;
  invitationService: InvitationService;
  mentorService: Pick<MentorService, 'recordSignInActivity'>;
  mentorInvitationService?: Pick<MentorInvitationService, 'recordAcceptance'>;
  clock: Clock;
  logger: Logger;
};

/** One message for every failed login, so the response never says whether the e-mail has an account. */
const INVALID_CREDENTIALS = 'Invalid credentials.';

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly eventBus: EventBus;
  private readonly invitationService: InvitationService;
  private readonly mentorService: Pick<MentorService, 'recordSignInActivity'>;
  private readonly mentorInvitationService?: Pick<MentorInvitationService, 'recordAcceptance'>;
  private readonly clock: Clock;
  private readonly logger: Logger;

  constructor({ userRepository, eventBus, invitationService, mentorService, mentorInvitationService, clock, logger }: Dependencies) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
    this.invitationService = invitationService;
    this.mentorService = mentorService;
    this.mentorInvitationService = mentorInvitationService;
    this.clock = clock;
    this.logger = logger;
  }

  async register(input: RegisterInput): Promise<UserDto> {
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await this.userRepository.create({ email: input.email, name: input.name, passwordHash });
      await this.eventBus.emit('auth.user.registered', { userId: user.id });
      return toUserDto(user);
    } catch (error) {
      // The unique constraint decides, not a read-then-write check, so two simultaneous sign-ups cannot both win.
      if (isUniqueConstraintViolation(error)) throw new ConflictError('Registration could not be completed.');
      throw error;
    }
  }

  /** Creates a passwordless account after GitHub has supplied a verified e-mail. */
  async registerWithGithub(email: string, name: string): Promise<UserDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      if (!(await this.invitationService.isAcceptedSeeker(existing.id))) {
        await this.invitationService.invite({ email: existing.email, displayName: existing.name, role: 'seeker' });
        const accepted = await this.invitationService.acceptForUser(existing.email, existing.id, this.clock.now());
        if (!accepted) throw new ConflictError('Could not assign the seeker account access.');
      }
      return toUserDto(existing);
    }

    try {
      const user = await this.userRepository.create({
        email: normalizedEmail,
        name: name.trim().slice(0, 100) || email,
        passwordHash: null,
      });
      await this.invitationService.invite({
        email: user.email,
        displayName: user.name,
        role: 'seeker',
      });
      const accepted = await this.invitationService.acceptForUser(user.email, user.id, this.clock.now());
      if (!accepted) throw new ConflictError('Could not assign the seeker account access.');
      await this.eventBus.emit('auth.user.registered', { userId: user.id });
      return toUserDto(user);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) throw new ConflictError('Registration could not be completed.');
      throw error;
    }
  }

  /** Lets a valid account retry link issuance if its first registration request failed after creation. */
  async registerForAccountLink(input: RegisterInput): Promise<UserDto> {
    try {
      return await this.register(input);
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error;
      return this.login({ email: input.email, password: input.password });
    }
  }

  async login(input: LoginInput): Promise<UserDto> {
    const user = await this.userRepository.findByEmail(input.email);

    // Fail closed: no account, no password set, or a wrong password are all the same answer.
    const isValid = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyAgainstDummy(input.password);
    if (!user || !isValid) throw new UnauthorizedError(INVALID_CREDENTIALS);

    await this.recordMentorSignIn(user.id);
    return toUserDto(user);
  }

  async signInWithMagicLink(email: string): Promise<UserDto> {
    const invitation = await this.invitationService.findUnrevokedByEmail(email);
    if (!invitation) throw new UnauthorizedError(INVALID_MAGIC_LINK_MESSAGE);

    let user = await this.userRepository.findByEmail(invitation.email);
    let created = false;
    if (!user) {
      try {
        user = await this.userRepository.create({
          email: invitation.email,
          name: invitation.displayName,
          passwordHash: null,
        });
        created = true;
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) throw error;
        user = await this.userRepository.findByEmail(invitation.email);
        if (!user) throw error;
      }
    }

    const acceptedAt = this.clock.now();
    const accepted = await this.invitationService.acceptForUser(
      invitation.email,
      user.id,
      acceptedAt,
    );
    if (!accepted) throw new UnauthorizedError(INVALID_MAGIC_LINK_MESSAGE);

    await this.mentorInvitationService?.recordAcceptance(invitation.email, user.id, acceptedAt);

    if (created) await this.eventBus.emit('auth.user.registered', { userId: user.id });
    await this.recordMentorSignIn(user.id);
    return toUserDto(user);
  }

  private async recordMentorSignIn(userId: string): Promise<void> {
    try {
      await this.mentorService.recordSignInActivity(userId);
    } catch (error) {
      this.logger.warn('Could not update mentor activity after sign-in.', { error, userId });
    }
  }
}
