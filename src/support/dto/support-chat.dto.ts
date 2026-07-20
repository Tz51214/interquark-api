import { IsString, IsArray, IsOptional, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class ChatTurnDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content: string;
}

export class SupportChatDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];
}
