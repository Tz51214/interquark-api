import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';

export class CreateInvoiceDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
