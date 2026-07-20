import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly repo: Repository<Ticket>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    const createdBy = await this.usersRepo.findOne({ where: { id: userId as any } });
    if (!createdBy) throw new NotFoundException('User not found.');

    const ticket = this.repo.create({
      createdBy,
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority,
    });
    return this.repo.save(ticket);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findMine(userId: string) {
    return this.repo.find({
      where: { createdBy: { id: userId as any } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const ticket = await this.repo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const ticket = await this.findOne(id);

    if (dto.assignedToId) {
      const assignee = await this.usersRepo.findOne({ where: { id: dto.assignedToId as any } });
      if (!assignee) throw new NotFoundException('Assignee not found.');
      ticket.assignedTo = assignee;
    }
    if (dto.status) ticket.status = dto.status;
    if (dto.priority) ticket.priority = dto.priority;

    return this.repo.save(ticket);
  }

  async remove(id: string) {
    const ticket = await this.findOne(id);
    await this.repo.remove(ticket);
    return { message: 'Ticket deleted' };
  }
}
