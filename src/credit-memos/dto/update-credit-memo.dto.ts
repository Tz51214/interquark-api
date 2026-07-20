import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CreditMemoStatus } from '../entities/credit-memo.entity';

export class UpdateCreditMemoDto {
  @IsOptional()
  @IsEnum(CreditMemoStatus)
  status?: CreditMemoStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
