import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateNotificationDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.userId as any } });
    if (!user) throw new NotFoundException('User not found.');

    const notification = this.repo.create({
      user,
      type: dto.type,
      title: dto.title,
      message: dto.message,
    });
    return this.repo.save(notification);
  }

  findMine(userId: string) {
    return this.repo.find({
      where: { user: { id: userId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  countUnread(userId: string) {
    return this.repo.count({ where: { user: { id: userId as any }, read: false } });
  }

  async findOne(id: string) {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found.');
    return notification;
  }

  async update(id: string, dto: UpdateNotificationDto) {
    const notification = await this.findOne(id);
    if (dto.read !== undefined) notification.read = dto.read;
    return this.repo.save(notification);
  }

  async markAllRead(userId: string) {
    await this.repo.update({ user: { id: userId as any }, read: false }, { read: true });
    return { message: 'All notifications marked as read' };
  }

  async remove(id: string) {
    const notification = await this.findOne(id);
    await this.repo.remove(notification);
    return { message: 'Notification deleted' };
  }
}
