import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateCreditMemoDto {
  @IsString()
  customerId: string;

  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  reason: string;
}
