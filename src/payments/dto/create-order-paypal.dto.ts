import { IsNumber } from 'class-validator';

export class CreateOrderPaypalDto {
  @IsNumber()
  orderId: number;
}
