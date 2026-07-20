import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePayoutDto {
  @IsString()
  freelancerId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
