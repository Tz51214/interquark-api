import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class UpdateTaskDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsISO8601()
  @IsOptional()
  dueDate?: string;
}
