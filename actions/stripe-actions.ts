import { updateProfile, updateProfileByStripeCustomerId } from "@/db/queries/profiles-queries";
import { SelectProfile } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

type MembershipStatus = SelectProfile["membership"];

const getMembershipStatus = (status: Stripe.Subscription.Status, membership: MembershipStatus): MembershipStatus => {
  switch (status) {
    case "active":
    case "trialing":
      return membership;
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    case "unpaid":
      return "trial";
    default:
      return "trial";
  }
};

const getSubscription = async (subscriptionId: string) => {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"]
  });
};

export const updateStripeCustomer = async (userId: string, subscriptionId: string, customerId: string) => {
  try {
    if (!userId || !subscriptionId || !customerId) {
      throw new Error("Missing required parameters for updateStripeCustomer");
    }

    const subscription = await getSubscription(subscriptionId);

    const updatedProfile = await updateProfile(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id
    });

    if (!updatedProfile) {
      throw new Error("Failed to update customer profile");
    }

    return updatedProfile;
  } catch (error) {
    console.error("Error in updateStripeCustomer:", error);
    throw error instanceof Error ? error : new Error("Failed to update Stripe customer");
  }
};

export const manageSubscriptionStatusChange = async (subscriptionId: string, customerId: string, productId: string): Promise<MembershipStatus> => {
  try {
    if (!subscriptionId || !customerId || !productId) {
      throw new Error("Missing required parameters for manageSubscriptionStatusChange");
    }

    const subscription = await getSubscription(subscriptionId);

    const product = await stripe.products.retrieve(productId);
    let membership = product.metadata.membership as MembershipStatus;

    // Valid membership types: trial, solo, small_firm, enterprise
    const validMemberships: MembershipStatus[] = ["trial", "solo", "small_firm", "enterprise"];
    if (!membership || !validMemberships.includes(membership)) {
      console.error(`Invalid membership type in product metadata: ${membership}. Expected one of: ${validMemberships.join(", ")}`);
      console.error(`Product ID: ${productId}, Product Name: ${product.name}`);
      // ACTUALLY default to solo if metadata is missing or invalid
      membership = "solo";
      console.log(`Defaulting to 'solo' membership for product: ${product.name}`);
    }

    const membershipStatus = getMembershipStatus(subscription.status, membership);

    await updateProfileByStripeCustomerId(customerId, {
      stripeSubscriptionId: subscription.id,
      membership: membershipStatus
    });

    return membershipStatus;
  } catch (error) {
    console.error("Error in manageSubscriptionStatusChange:", error);
    throw error instanceof Error ? error : new Error("Failed to update subscription status");
  }
};
