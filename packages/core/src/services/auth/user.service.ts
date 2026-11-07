import type { UserRepository } from '@devmentor/db';
import { NotFoundError } from '../../http/errors';
import { toUserDto, type Page, type UserDto } from '../dto';
import type { OperatorUserListQuery } from '../../validators/auth/operator-user-list.schema';

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

  async listForOperator({ page, pageSize }: OperatorUserListQuery): Promise<Page<UserDto>> {
    const { items, total } = await this.userRepository.findPage({ limit: pageSize, offset: (page - 1) * pageSize });
    return { items: items.map(toUserDto), page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
