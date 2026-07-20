import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout, PayoutStatus } from './entities/payout.entity';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout) private readonly repo: Repository<Payout>,
  ) {}

  async create(dto: CreatePayoutDto) {
    const payout = this.repo.create({
      freelancer: { id: Number(dto.freelancerId) } as any,
      project: dto.projectId ? ({ id: Number(dto.projectId) } as any) : null,
      amount: dto.amount,
      notes: dto.notes,
    });
    return this.repo.save(payout);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findMine(freelancerId: number) {
    return this.repo.find({
      where: { freelancer: { id: freelancerId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const payout = await this.repo.findOne({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    return payout;
  }

  async update(id: string, dto: UpdatePayoutDto) {
    const payout = await this.findOne(id);
    if (dto.status === PayoutStatus.PAID && payout.status !== PayoutStatus.PAID) {
      payout.paidAt = new Date();
    }
    if (dto.status) payout.status = dto.status;
    if (dto.notes !== undefined) payout.notes = dto.notes;
    return this.repo.save(payout);
  }

  async remove(id: string) {
    const payout = await this.findOne(id);
    await this.repo.remove(payout);
    return { message: 'Payout deleted' };
  }
}
