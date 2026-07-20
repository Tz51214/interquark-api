import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User, UserRole, VerificationStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Matches Magento's default "Online Customers" session lifetime.
const ONLINE_WINDOW_MINUTES = 15;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  async findAll(role?: UserRole) {
    const where = role ? { role } : {};
    const users = await this.usersRepository.find({ where });
    return users.map(({ password, ...safe }) => safe);
  }

  // New — powers the admin "Now Online" view.
  async findOnline() {
    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);
    const users = await this.usersRepository.find({
      where: { lastActiveAt: MoreThan(cutoff) },
      order: { lastActiveAt: 'DESC' },
    });
    return users.map(({ password, ...safe }) => safe);
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  async remove(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    try {
      await this.usersRepository.remove(user);
      return { message: 'User deleted' };
    } catch (err: any) {
      if (err.code === '23503') {
        throw new ConflictException(
          'Cannot delete this user because they have associated orders or projects. Remove those first.',
        );
      }
      throw err;
    }
  }

  async verify(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.verificationStatus = VerificationStatus.VERIFIED;
    return this.usersRepository.save(user);
  }

  async reject(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.verificationStatus = VerificationStatus.REJECTED;
    return this.usersRepository.save(user);
  }
}
