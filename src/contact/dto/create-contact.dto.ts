import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  message: string;
}
