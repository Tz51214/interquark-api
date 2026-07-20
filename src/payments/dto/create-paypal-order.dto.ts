import { IsEnum } from 'class-validator';
import { SubscriptionTier } from '../../subscriptions/entities/subscription.entity';

export class CreatePaypalOrderDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;
}
