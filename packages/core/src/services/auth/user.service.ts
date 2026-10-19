import type { User, UserRepository } from '@devmentor/db';
import { NotFoundError } from '../../http/errors';

export class UserService {
  private readonly userRepository: UserRepository;

  constructor({ userRepository }: { userRepository: UserRepository }) {
    this.userRepository = userRepository;
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  async getByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }
}
