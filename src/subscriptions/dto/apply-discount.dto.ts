import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class ApplyDiscountDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number;
}
