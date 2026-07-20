import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  message: string;
}
