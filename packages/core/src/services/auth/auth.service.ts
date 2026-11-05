import { isUniqueConstraintViolation, type UserRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { ConflictError, UnauthorizedError } from '../../http/errors';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../security/password';
import type { Clock } from '../../utils/clock';
import type { LoginInput } from '../../validators/auth/login.schema';
import type { RegisterInput } from '../../validators/auth/register.schema';
import { toUserDto, type UserDto } from '../dto';
import type { InvitationService } from './invitation.service';
import { INVALID_MAGIC_LINK_MESSAGE } from './magic-link.constants';

type Dependencies = {
  userRepository: UserRepository;
  eventBus: EventBus;
  invitationService: InvitationService;
  clock: Clock;
};

/** One message for every failed login, so the response never says whether the e-mail has an account. */
const INVALID_CREDENTIALS = 'Invalid credentials.';

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly eventBus: EventBus;
  private readonly invitationService: InvitationService;
  private readonly clock: Clock;

  constructor({ userRepository, eventBus, invitationService, clock }: Dependencies) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
    this.invitationService = invitationService;
    this.clock = clock;
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

  async login(input: LoginInput): Promise<UserDto> {
    const user = await this.userRepository.findByEmail(input.email);

    // Fail closed: no account, no password set, or a wrong password are all the same answer.
    const isValid = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyAgainstDummy(input.password);
    if (!user || !isValid) throw new UnauthorizedError(INVALID_CREDENTIALS);

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

    const accepted = await this.invitationService.acceptForUser(
      invitation.email,
      user.id,
      this.clock.now(),
    );
    if (!accepted) throw new UnauthorizedError(INVALID_MAGIC_LINK_MESSAGE);

    if (created) await this.eventBus.emit('auth.user.registered', { userId: user.id });
    return toUserDto(user);
  }
}
