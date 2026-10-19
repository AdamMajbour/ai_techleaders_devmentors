import type { UserRepository } from '@devmentor/db';
import { NotFoundError } from '../../http/errors';
import { toUserDto, type UserDto } from '../dto';

export class UserService {
  private readonly userRepository: UserRepository;

  constructor({ userRepository }: { userRepository: UserRepository }) {
    this.userRepository = userRepository;
  }

  async getById(id: string): Promise<UserDto> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found.');
    return toUserDto(user);
  }
}
