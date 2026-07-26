import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ValidateDiscountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  orderTotal: number;
}
