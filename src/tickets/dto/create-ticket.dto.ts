import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
  @IsString()
  @MaxLength(150)
  subject: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
