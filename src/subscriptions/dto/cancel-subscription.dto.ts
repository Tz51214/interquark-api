import { IsString } from 'class-validator';

export class CancelSubscriptionDto {
  @IsString()
  reason: string;
}
