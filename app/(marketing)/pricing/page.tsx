/**
 * Pricing Page
 * Phase 12.3: Server component for three-tier pricing
 */

import { auth } from "@clerk/nextjs/server";
import dynamic from "next/dynamic";

const PricingPageClient = dynamic(() => import("./pricing-page-client"), {
  ssr: true,
});

export default async function PricingPage() {
  const { userId } = await auth();

  // Get Stripe price IDs from environment variables
  // Solo tier
  const soloPriceIdMonthly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_MONTHLY || "";
  const soloPriceIdYearly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_YEARLY || "";

  // Small Firm tier
  const firmPriceIdMonthly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_MONTHLY || "";
  const firmPriceIdYearly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_YEARLY || "";

  return (
    <PricingPageClient
      userId={userId}
      soloPriceIdMonthly={soloPriceIdMonthly}
      soloPriceIdYearly={soloPriceIdYearly}
      firmPriceIdMonthly={firmPriceIdMonthly}
      firmPriceIdYearly={firmPriceIdYearly}
    />
  );
}
