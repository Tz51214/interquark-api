import { IsEnum, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DiscountType } from '../entities/discount-code.entity';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsInt()
  @IsOptional()
  maxUses?: number;

  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
