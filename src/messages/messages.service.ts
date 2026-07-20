import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Project) private readonly projectsRepository: Repository<Project>,
  ) {}

  private async getProjectWithAccessCheck(projectId: number, user: { userId: number; role: string }) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['order', 'order.customer', 'freelancer'],
    });
    if (!project) throw new NotFoundException('Project not found');

    const isAdmin = user.role === 'admin';
    const isFreelancer = project.freelancer?.id === user.userId;
    const isCustomer = project.order?.customer?.id === user.userId;

    if (!isAdmin && !isFreelancer && !isCustomer) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async findForProject(projectId: number, user: { userId: number; role: string }) {
    await this.getProjectWithAccessCheck(projectId, user);

    return this.messagesRepository.find({
      where: { project: { id: projectId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    projectId: number,
    content: string,
    user: { userId: number; role: string },
    attachment?: { attachmentUrl: string; attachmentName: string; attachmentType: string },
  ) {
    await this.getProjectWithAccessCheck(projectId, user);

    const message = this.messagesRepository.create({
      project: { id: projectId } as Project,
      sender: { id: user.userId } as any,
      content,
      attachmentUrl: attachment?.attachmentUrl ?? null,
      attachmentName: attachment?.attachmentName ?? null,
      attachmentType: attachment?.attachmentType ?? null,
    });

    const saved = await this.messagesRepository.save(message);

    return this.messagesRepository.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });
  }
}
