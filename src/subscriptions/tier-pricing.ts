import { SubscriptionTier } from './entities/subscription.entity';

// Monthly price in GBP for each tier. Single source of truth used by
// Stripe/PayPal checkout session creation.
export const TIER_PRICING: Record<SubscriptionTier, { label: string; price: number }> = {
  [SubscriptionTier.ASSOCIATE]: { label: 'Associate', price: 29 },
  [SubscriptionTier.CORE]: { label: 'Core contributor', price: 79 },
  [SubscriptionTier.LEAD]: { label: 'Lead collaborator', price: 159 },
};
