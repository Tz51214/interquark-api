import { EmailService } from '../email/email.service';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projectsRepository: Repository<Project>,
    private readonly emailService: EmailService,
  ) {}

  async findAll() {
    return this.projectsRepository.find({
      relations: ['order', 'order.customer', 'freelancer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findMine(userId: number, role: string) {
    const where =
      role === 'client'
        ? { order: { customer: { id: userId } } }
        : { freelancer: { id: userId } };

    return this.projectsRepository.find({
      where,
      relations: ['order', 'order.customer', 'freelancer'],
      order: { createdAt: 'DESC' },
    });
  }

  async assignFreelancer(projectId: number, freelancerId: number) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['order', 'order.items'],
    });
    if (!project) throw new NotFoundException('Project not found');

    project.freelancer = { id: freelancerId } as User;
    project.status = ProjectStatus.IN_PROGRESS;
    const saved = await this.projectsRepository.save(project);

    const reloaded = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['freelancer', 'order', 'order.items'],
    });
    if (reloaded?.freelancer) {
      const itemNames = reloaded.order?.items?.map((i) => i.name).join(', ') || 'a project';
      await this.emailService.sendFreelancerAssigned(
        reloaded.freelancer.email,
        reloaded.freelancer.fullName,
        itemNames,
      );
    }

    return saved;
  }

  async updateStatus(projectId: number, status: string, user: { userId: number; role: string }) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['order', 'order.customer', 'order.items', 'freelancer'],
    });
    if (!project) throw new NotFoundException('Project not found');

    if (user.role !== 'admin' && project.freelancer?.id !== user.userId) {
      throw new ForbiddenException('You can only update projects assigned to you');
    }

    if (!Object.values(ProjectStatus).includes(status as ProjectStatus)) {
      throw new NotFoundException('Invalid status value');
    }

    project.status = status as ProjectStatus;
    const saved = await this.projectsRepository.save(project);

    const customer = project.order?.customer;
    if (customer) {
      const itemNames = project.order?.items?.map((i) => i.name).join(', ') || 'your order';
      await this.emailService.sendProjectStatusUpdate(
        customer.email,
        customer.fullName,
        itemNames,
        status,
      );
    }

    return saved;
  }

  async updateProgress(projectId: number, progress: number, user: { userId: number; role: string }) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['freelancer'],
    });
    if (!project) throw new NotFoundException('Project not found');

    if (user.role !== 'admin' && project.freelancer?.id !== user.userId) {
      throw new ForbiddenException('You can only update projects assigned to you');
    }

    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    project.progress = clamped;
    return this.projectsRepository.save(project);
  }
async remove(id: number) {
  const project = await this.projectsRepository.findOne({ where: { id } });
  if (!project) throw new NotFoundException('Project not found');
  await this.projectsRepository.remove(project);
  return { message: 'Project deleted' }; 
 }
}
