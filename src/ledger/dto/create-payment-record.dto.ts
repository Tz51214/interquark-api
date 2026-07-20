import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { PaymentMethod, PaymentStatus, TransactionType } from '../entities/payment-record.entity';

export class CreatePaymentRecordDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(TransactionType)
  txnType?: TransactionType;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
