"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Check } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface PricingPageClientProps {
  userId: string | null;
  monthlyPriceId: string;
  yearlyPriceId: string;
  monthlyPrice: string;
  yearlyPrice: string;
}

/**
 * Client component for the pricing page
 * Allows switching between monthly and yearly billing with a toggle
 * Displays a modern pricing card UI with animated transitions
 * Uses Stripe Checkout for payment processing
 */
export default function PricingPageClient({
  userId,
  monthlyPriceId,
  yearlyPriceId,
  monthlyPrice,
  yearlyPrice,
}: PricingPageClientProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Calculate yearly savings
  const monthlyCost = parseInt(monthlyPrice.replace(/[^0-9]/g, ''));
  const yearlyCost = parseInt(yearlyPrice.replace(/[^0-9]/g, ''));
  const annualMonthlyCost = monthlyCost * 12;
  const savings = annualMonthlyCost - yearlyCost;
  const savingsPercentage = Math.round((savings / annualMonthlyCost) * 100);
  const savingsAmount = `$${savings}`;

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      // Redirect to sign-in if not authenticated
      if (!userId) {
        router.push('/login');
        return;
      }

      const priceId = billingCycle === "monthly" ? monthlyPriceId : yearlyPriceId;

      if (!priceId) {
        console.error('Missing Stripe price ID');
        alert('Configuration error. Please contact support.');
        return;
      }

      // Call the API endpoint to create a Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating checkout:', errorData);
        alert('Failed to create checkout. Please try again.');
        return;
      }

      const data = await response.json();

      if (!data.url) {
        console.error('No checkout URL in response', data);
        alert('Failed to create checkout. Please try again.');
        return;
      }

      // Redirect to the Stripe checkout URL
      window.location.href = data.url;
    } catch (error) {
      console.error('Error initiating checkout:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "1,000 credits per billing cycle",
    "Automatic credit renewals",
    "Access to all premium features",
    "Priority support",
    "Cancel anytime"
  ];

  return (
    <div className="container mx-auto py-16 max-w-5xl">
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-5xl font-bold">Pick Your Plan</h1>
        <p className="text-xl text-muted-foreground mt-4">Choose between monthly or yearly billing</p>

        {/* Billing toggle */}
        <div className="flex justify-center mt-8">
          <ToggleGroup
            type="single"
            value={billingCycle}
            onValueChange={(value) => value && setBillingCycle(value as "monthly" | "yearly")}
            className="border rounded-full p-1.5 bg-white shadow-sm"
          >
            <ToggleGroupItem
              value="monthly"
              className="rounded-full px-10 py-2.5 text-base font-medium data-[state=on]:bg-black data-[state=on]:text-white transition-all"
            >
              Monthly
            </ToggleGroupItem>
            <ToggleGroupItem
              value="yearly"
              className="rounded-full px-10 py-2.5 text-base font-medium data-[state=on]:bg-black data-[state=on]:text-white transition-all"
            >
              Yearly
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={billingCycle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="w-full border-2 border-primary shadow-lg relative overflow-hidden">
                {billingCycle === "yearly" && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      Save {savingsPercentage}%
                    </div>
                  </div>
                )}

                <CardHeader className="pb-8 pt-6">
                  <CardTitle className="text-3xl font-bold">Pro Plan</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {billingCycle === "monthly" ? "Billed monthly" : "Billed annually"}
                  </CardDescription>

                  <div className="mt-6">
                    <span className="text-5xl font-bold">
                      {billingCycle === "monthly" ? monthlyPrice : yearlyPrice}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {billingCycle === "yearly" ? "/year" : "/month"}
                    </span>
                  </div>

                  {billingCycle === "yearly" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {savingsAmount} savings compared to monthly
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pb-8">
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <div className="rounded-full bg-primary/10 p-1 mr-3 mt-0.5">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-base">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full h-12 text-base font-semibold"
                    size="lg"
                  >
                    {isLoading ? "Processing..." : "Get Started"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
