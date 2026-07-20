import { IsString, IsOptional, IsArray, IsNumber, IsEnum, Min } from 'class-validator';
import { AvailabilityStatus } from '../entities/developer-profile.entity';

export class CreateDeveloperProfileDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availability?: AvailabilityStatus;
}
