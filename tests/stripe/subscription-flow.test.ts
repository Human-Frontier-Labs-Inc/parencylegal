/**
 * Stripe Subscription Flow Tests
 * TDD tests to ensure subscription webhooks properly update user profiles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database queries
vi.mock('@/db/queries/profiles-queries', () => ({
  updateProfile: vi.fn(),
  updateProfileByStripeCustomerId: vi.fn(),
  getProfileByUserId: vi.fn()
}));

// Mock Stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      retrieve: vi.fn()
    },
    products: {
      retrieve: vi.fn()
    },
    prices: {
      retrieve: vi.fn()
    }
  }
}));

import { manageSubscriptionStatusChange, updateStripeCustomer } from '@/actions/stripe-actions';
import { updateProfile, updateProfileByStripeCustomerId } from '@/db/queries/profiles-queries';
import { stripe } from '@/lib/stripe';

describe('Stripe Subscription Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('manageSubscriptionStatusChange', () => {
    const mockSubscription = {
      id: 'sub_test123',
      status: 'active',
      items: {
        data: [{
          price: {
            id: 'price_test123',
            product: 'prod_test123'
          }
        }]
      },
      current_period_start: 1700000000,
      current_period_end: 1702592000
    };

    it('should update membership to "solo" when product metadata is "solo"', async () => {
      // Arrange
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription as any);
      vi.mocked(stripe.products.retrieve).mockResolvedValue({
        id: 'prod_test123',
        name: 'Parency Solo',
        metadata: { membership: 'solo' }
      } as any);
      vi.mocked(updateProfileByStripeCustomerId).mockResolvedValue({
        userId: 'user_test123',
        membership: 'solo'
      } as any);

      // Act
      const result = await manageSubscriptionStatusChange(
        'sub_test123',
        'cus_test123',
        'prod_test123'
      );

      // Assert
      expect(result).toBe('solo');
      expect(updateProfileByStripeCustomerId).toHaveBeenCalledWith(
        'cus_test123',
        expect.objectContaining({
          membership: 'solo'
        })
      );
    });

    it('should update membership to "small_firm" when product metadata is "small_firm"', async () => {
      // Arrange
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription as any);
      vi.mocked(stripe.products.retrieve).mockResolvedValue({
        id: 'prod_test123',
        name: 'Parency Small Firm',
        metadata: { membership: 'small_firm' }
      } as any);
      vi.mocked(updateProfileByStripeCustomerId).mockResolvedValue({
        userId: 'user_test123',
        membership: 'small_firm'
      } as any);

      // Act
      const result = await manageSubscriptionStatusChange(
        'sub_test123',
        'cus_test123',
        'prod_test123'
      );

      // Assert
      expect(result).toBe('small_firm');
      expect(updateProfileByStripeCustomerId).toHaveBeenCalledWith(
        'cus_test123',
        expect.objectContaining({
          membership: 'small_firm'
        })
      );
    });

    it('should default to "solo" when product metadata is missing', async () => {
      // Arrange
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription as any);
      vi.mocked(stripe.products.retrieve).mockResolvedValue({
        id: 'prod_test123',
        name: 'Unknown Product',
        metadata: {} // No membership metadata!
      } as any);
      vi.mocked(updateProfileByStripeCustomerId).mockResolvedValue({
        userId: 'user_test123',
        membership: 'solo'
      } as any);

      // Act
      const result = await manageSubscriptionStatusChange(
        'sub_test123',
        'cus_test123',
        'prod_test123'
      );

      // Assert - should default to solo, not fail!
      expect(result).toBe('solo');
      expect(updateProfileByStripeCustomerId).toHaveBeenCalledWith(
        'cus_test123',
        expect.objectContaining({
          membership: 'solo'
        })
      );
    });

    it('should default to "solo" when product metadata is invalid', async () => {
      // Arrange
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription as any);
      vi.mocked(stripe.products.retrieve).mockResolvedValue({
        id: 'prod_test123',
        name: 'Unknown Product',
        metadata: { membership: 'invalid_tier' } // Invalid membership!
      } as any);
      vi.mocked(updateProfileByStripeCustomerId).mockResolvedValue({
        userId: 'user_test123',
        membership: 'solo'
      } as any);

      // Act
      const result = await manageSubscriptionStatusChange(
        'sub_test123',
        'cus_test123',
        'prod_test123'
      );

      // Assert - should default to solo, not fail!
      expect(result).toBe('solo');
      expect(updateProfileByStripeCustomerId).toHaveBeenCalledWith(
        'cus_test123',
        expect.objectContaining({
          membership: 'solo'
        })
      );
    });

    it('should revert to "trial" when subscription is canceled', async () => {
      // Arrange
      const canceledSubscription = {
        ...mockSubscription,
        status: 'canceled'
      };
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(canceledSubscription as any);
      vi.mocked(stripe.products.retrieve).mockResolvedValue({
        id: 'prod_test123',
        name: 'Parency Solo',
        metadata: { membership: 'solo' }
      } as any);
      vi.mocked(updateProfileByStripeCustomerId).mockResolvedValue({
        userId: 'user_test123',
        membership: 'trial'
      } as any);

      // Act
      const result = await manageSubscriptionStatusChange(
        'sub_test123',
        'cus_test123',
        'prod_test123'
      );

      // Assert
      expect(result).toBe('trial');
      expect(updateProfileByStripeCustomerId).toHaveBeenCalledWith(
        'cus_test123',
        expect.objectContaining({
          membership: 'trial'
        })
      );
    });

    it('should handle "enterprise" membership', async () => {
      // Arrange
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription as any);
      vi.mocked(stripe.products.retrieve).mockResolvedValue({
        id: 'prod_test123',
        name: 'Parency Enterprise',
        metadata: { membership: 'enterprise' }
      } as any);
      vi.mocked(updateProfileByStripeCustomerId).mockResolvedValue({
        userId: 'user_test123',
        membership: 'enterprise'
      } as any);

      // Act
      const result = await manageSubscriptionStatusChange(
        'sub_test123',
        'cus_test123',
        'prod_test123'
      );

      // Assert
      expect(result).toBe('enterprise');
      expect(updateProfileByStripeCustomerId).toHaveBeenCalledWith(
        'cus_test123',
        expect.objectContaining({
          membership: 'enterprise'
        })
      );
    });
  });

  describe('updateStripeCustomer', () => {
    it('should save stripe customer and subscription IDs', async () => {
      // Arrange
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_test123'
      } as any);
      vi.mocked(updateProfile).mockResolvedValue({
        userId: 'user_test123',
        stripeCustomerId: 'cus_test123',
        stripeSubscriptionId: 'sub_test123'
      } as any);

      // Act
      const result = await updateStripeCustomer(
        'user_test123',
        'sub_test123',
        'cus_test123'
      );

      // Assert
      expect(result).toMatchObject({
        stripeCustomerId: 'cus_test123',
        stripeSubscriptionId: 'sub_test123'
      });
      expect(updateProfile).toHaveBeenCalledWith(
        'user_test123',
        expect.objectContaining({
          stripeCustomerId: 'cus_test123',
          stripeSubscriptionId: 'sub_test123'
        })
      );
    });

    it('should throw error if userId is missing', async () => {
      // Act & Assert
      await expect(
        updateStripeCustomer('', 'sub_test123', 'cus_test123')
      ).rejects.toThrow('Missing required parameters');
    });
  });
});
