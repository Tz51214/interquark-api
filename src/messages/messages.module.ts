import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Project])],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}

