import { auth } from "@clerk/nextjs/server";
import dynamic from "next/dynamic";

const PricingPageClient = dynamic(() => import("./pricing-page-client"), { ssr: true });

export default async function PricingPage() {
  const { userId } = await auth();

  // Get Stripe price IDs from environment variables
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '';
  const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || '';

  // Pricing values
  const monthlyPrice = "$30";
  const yearlyPrice = "$249";

  return (
    <PricingPageClient
      userId={userId}
      monthlyPriceId={monthlyPriceId}
      yearlyPriceId={yearlyPriceId}
      monthlyPrice={monthlyPrice}
      yearlyPrice={yearlyPrice}
    />
  );
}
