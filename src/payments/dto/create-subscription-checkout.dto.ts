import { IsEnum } from 'class-validator';
import { SubscriptionTier } from '../../subscriptions/entities/subscription.entity';

export class CreateSubscriptionCheckoutDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;
}
