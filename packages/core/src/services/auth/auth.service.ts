import { isUniqueConstraintViolation, type UserRepository } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { ConflictError, UnauthorizedError } from '../../http/errors';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../security/password';
import type { LoginInput } from '../../validators/auth/login.schema';
import type { RegisterInput } from '../../validators/auth/register.schema';
import { toUserDto, type UserDto } from '../dto';

type Dependencies = { userRepository: UserRepository; eventBus: EventBus };

/** One message for every failed login, so the response never says whether the e-mail has an account. */
const INVALID_CREDENTIALS = 'Invalid credentials.';

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly eventBus: EventBus;

  constructor({ userRepository, eventBus }: Dependencies) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
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
}
