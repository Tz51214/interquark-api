import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasksRepo: Repository<Task>,
    @InjectRepository(Project) private readonly projectsRepo: Repository<Project>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateTaskDto) {
    const project = await this.projectsRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found.');

    const freelancer = await this.usersRepo.findOne({ where: { id: dto.freelancerId } });
    if (!freelancer) throw new NotFoundException('Freelancer not found.');

    const task = this.tasksRepo.create({
      title: dto.title,
      description: dto.description,
      project,
      freelancer,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
    return this.tasksRepo.save(task);
  }

  findMine(freelancerId: number) {
    return this.tasksRepo.find({
      where: { freelancer: { id: freelancerId } },
      order: { createdAt: 'DESC' },
    });
  }

  findAll() {
    return this.tasksRepo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: number, freelancerId: number, isAdmin: boolean, dto: UpdateTaskDto) {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found.');
    if (!isAdmin && task.freelancer.id !== freelancerId) {
      throw new ForbiddenException('This task is not assigned to you.');
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    return this.tasksRepo.save(task);
  }

  async remove(id: number) {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found.');
    await this.tasksRepo.remove(task);
    return { deleted: true };
  }
}
