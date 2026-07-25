import { IsEnum, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  projectId: number;

  @IsInt()
  freelancerId: number;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsISO8601()
  @IsOptional()
  dueDate?: string;
}
