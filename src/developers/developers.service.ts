import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeveloperProfile } from './entities/developer-profile.entity';
import { User } from '../users/entities/user.entity';
import { CreateDeveloperProfileDto } from './dto/create-developer-profile.dto';
import { UpdateDeveloperProfileDto } from './dto/update-developer-profile.dto';

@Injectable()
export class DevelopersService {
  constructor(
    @InjectRepository(DeveloperProfile) private readonly repo: Repository<DeveloperProfile>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateDeveloperProfileDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.userId as any } });
    if (!user) throw new NotFoundException('User not found.');

    const existing = await this.repo.findOne({ where: { user: { id: dto.userId as any } } });
    if (existing) throw new ConflictException('This user already has a developer profile.');

    const profile = this.repo.create({
      user,
      bio: dto.bio,
      skills: dto.skills ?? [],
      portfolioUrl: dto.portfolioUrl,
      hourlyRate: dto.hourlyRate,
      availability: dto.availability,
    });
    return this.repo.save(profile);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findByUserId(userId: string) {
    const profile = await this.repo.findOne({ where: { user: { id: userId as any } } });
    if (!profile) throw new NotFoundException('Developer profile not found.');
    return profile;
  }

  async findOne(id: string) {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Developer profile not found.');
    return profile;
  }

  async update(id: string, dto: UpdateDeveloperProfileDto) {
    const profile = await this.findOne(id);
    Object.assign(profile, dto);
    return this.repo.save(profile);
  }

  async remove(id: string) {
    const profile = await this.findOne(id);
    await this.repo.remove(profile);
    return { message: 'Developer profile deleted' };
  }
}
