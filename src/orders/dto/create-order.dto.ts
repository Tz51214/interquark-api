import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tier: string;

  @IsNumber()
  price: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
