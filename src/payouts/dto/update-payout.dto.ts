import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PayoutStatus } from '../entities/payout.entity';

export class UpdatePayoutDto {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
