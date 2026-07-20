import { IsString, IsOptional, IsBoolean, IsObject, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(40)
  sku: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsObject()
  tiers: Record<string, number>;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
