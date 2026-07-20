import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum SignupRole {
  CLIENT = 'client',
  FREELANCER = 'freelancer',
}

export enum SignupTier {
  ASSOCIATE = 'associate',
  CORE = 'core',
  LEAD = 'lead',
}

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsEnum(SignupRole)
  role?: SignupRole;

  @IsOptional()
  @IsEnum(SignupTier)
  tier?: SignupTier;
}
