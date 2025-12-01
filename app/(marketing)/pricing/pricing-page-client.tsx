"use client";

/**
 * Pricing Page Client Component
 * Phase 12.3: Three-tier pricing as defined in user stories
 *
 * Solo: $99/month (10 cases, 500 docs/month, 1 seat)
 * Small Firm: $299/month (50 cases, 2,500 docs/month, 5 seats)
 * Enterprise: Custom (unlimited)
 */

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Check,
  Users,
  FileText,
  Briefcase,
  Sparkles,
  Building2,
  ArrowRight,
  Shield,
  Zap,
  MessageSquare,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  priceIdMonthly: string;
  priceIdYearly: string;
  cases: number | "unlimited";
  docsPerMonth: number | "unlimited";
  seats: number | "unlimited";
  features: string[];
  highlighted?: boolean;
  badge?: string;
  icon: typeof Users;
}

interface PricingPageClientProps {
  userId: string | null;
  soloPriceIdMonthly: string;
  soloPriceIdYearly: string;
  firmPriceIdMonthly: string;
  firmPriceIdYearly: string;
}

export default function PricingPageClient({
  userId,
  soloPriceIdMonthly,
  soloPriceIdYearly,
  firmPriceIdMonthly,
  firmPriceIdYearly,
}: PricingPageClientProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();

  const tiers: PricingTier[] = [
    {
      name: "Solo",
      description: "Perfect for solo practitioners",
      monthlyPrice: 99,
      yearlyPrice: 948, // $79/month billed yearly (20% off)
      priceIdMonthly: soloPriceIdMonthly,
      priceIdYearly: soloPriceIdYearly,
      cases: 10,
      docsPerMonth: 500,
      seats: 1,
      icon: Users,
      features: [
        "Up to 10 active cases",
        "500 documents/month",
        "AI document classification",
        "Dropbox sync",
        "Discovery tracking",
        "PDF exports",
        "Email support",
      ],
    },
    {
      name: "Small Firm",
      description: "For growing family law practices",
      monthlyPrice: 299,
      yearlyPrice: 2868, // $239/month billed yearly (20% off)
      priceIdMonthly: firmPriceIdMonthly,
      priceIdYearly: firmPriceIdYearly,
      cases: 50,
      docsPerMonth: 2500,
      seats: 5,
      icon: Briefcase,
      highlighted: true,
      badge: "Most Popular",
      features: [
        "Up to 50 active cases",
        "2,500 documents/month",
        "Everything in Solo, plus:",
        "5 team member seats",
        "Priority AI processing",
        "Advanced analytics",
        "Priority support",
        "Bulk operations",
      ],
    },
    {
      name: "Enterprise",
      description: "For large firms with custom needs",
      monthlyPrice: 0, // Custom pricing
      yearlyPrice: 0,
      priceIdMonthly: "",
      priceIdYearly: "",
      cases: "unlimited",
      docsPerMonth: "unlimited",
      seats: "unlimited",
      icon: Building2,
      features: [
        "Unlimited active cases",
        "Unlimited documents",
        "Unlimited team members",
        "Everything in Small Firm, plus:",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantees",
        "On-premise option",
        "SSO/SAML authentication",
      ],
    },
  ];

  const handleCheckout = async (tier: PricingTier) => {
    try {
      setIsLoading(tier.name);

      // Enterprise - contact sales
      if (tier.name === "Enterprise") {
        window.location.href = "mailto:enterprise@parencylegal.com?subject=Enterprise%20Inquiry";
        setIsLoading(null);
        return;
      }

      // Redirect to sign-in if not authenticated
      if (!userId) {
        router.push("/login?redirect_url=/pricing");
        return;
      }

      const priceId = billingCycle === "monthly" ? tier.priceIdMonthly : tier.priceIdYearly;

      if (!priceId) {
        console.error("Missing Stripe price ID for", tier.name);
        alert("Configuration error. Please contact support.");
        return;
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error creating checkout:", errorData);
        alert("Failed to create checkout. Please try again.");
        return;
      }

      const data = await response.json();

      if (!data.url) {
        console.error("No checkout URL in response", data);
        alert("Failed to create checkout. Please try again.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Error initiating checkout:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  const getPrice = (tier: PricingTier) => {
    if (tier.name === "Enterprise") return "Custom";
    return billingCycle === "monthly"
      ? `$${tier.monthlyPrice}`
      : `$${Math.round(tier.yearlyPrice / 12)}`;
  };

  const getSavings = (tier: PricingTier) => {
    if (tier.name === "Enterprise") return null;
    const monthlyCost = tier.monthlyPrice * 12;
    const yearlyCost = tier.yearlyPrice;
    const savings = monthlyCost - yearlyCost;
    return savings;
  };

  return (
    <div className="container mx-auto py-16 px-4 max-w-7xl">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <Badge variant="outline" className="mb-4">
          Pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start with a 14-day free trial. No credit card required.
          <br />
          Choose the plan that fits your practice.
        </p>

        {/* Billing toggle */}
        <div className="flex flex-col items-center gap-3 mt-8">
          <ToggleGroup
            type="single"
            value={billingCycle}
            onValueChange={(value) =>
              value && setBillingCycle(value as "monthly" | "yearly")
            }
            className="border rounded-full p-1.5 bg-white shadow-sm"
          >
            <ToggleGroupItem
              value="monthly"
              className="rounded-full px-6 md:px-10 py-2.5 text-sm md:text-base font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all"
            >
              Monthly
            </ToggleGroupItem>
            <ToggleGroupItem
              value="yearly"
              className="rounded-full px-6 md:px-10 py-2.5 text-sm md:text-base font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all"
            >
              Yearly
              <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">
                Save 20%
              </Badge>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <AnimatePresence mode="wait">
          {tiers.map((tier, index) => (
            <motion.div
              key={`${tier.name}-${billingCycle}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card
                className={`h-full flex flex-col relative ${
                  tier.highlighted
                    ? "border-2 border-primary shadow-xl scale-105"
                    : "border shadow-md"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm">
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pt-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        tier.highlighted ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <tier.icon
                        className={`h-5 w-5 ${
                          tier.highlighted ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {tier.description}
                  </CardDescription>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl md:text-5xl font-bold">
                        {getPrice(tier)}
                      </span>
                      {tier.name !== "Enterprise" && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>
                    {billingCycle === "yearly" && tier.name !== "Enterprise" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually (${tier.yearlyPrice}/year)
                      </p>
                    )}
                    {billingCycle === "yearly" && getSavings(tier) && (
                      <Badge
                        variant="secondary"
                        className="mt-2 bg-green-100 text-green-700"
                      >
                        Save ${getSavings(tier)}/year
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {tier.cases === "unlimited" ? (
                          <span className="text-primary">∞</span>
                        ) : (
                          tier.cases
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Cases</p>
                    </div>
                    <div className="text-center border-x">
                      <p className="text-lg font-bold">
                        {tier.docsPerMonth === "unlimited" ? (
                          <span className="text-primary">∞</span>
                        ) : (
                          tier.docsPerMonth.toLocaleString()
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Docs/mo</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {tier.seats === "unlimited" ? (
                          <span className="text-primary">∞</span>
                        ) : (
                          tier.seats
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Seats</p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Button
                    onClick={() => handleCheckout(tier)}
                    disabled={isLoading === tier.name}
                    className={`w-full h-12 text-base font-semibold ${
                      tier.highlighted
                        ? ""
                        : tier.name === "Enterprise"
                        ? "bg-slate-800 hover:bg-slate-700"
                        : ""
                    }`}
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                  >
                    {isLoading === tier.name ? (
                      "Processing..."
                    ) : tier.name === "Enterprise" ? (
                      <>
                        Contact Sales
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Trust Indicators */}
      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground mb-6">
          Trusted by family law attorneys nationwide
        </p>
        <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="text-sm">SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <span className="text-sm">99.9% Uptime</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm">Priority Support</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm">AI-Powered</span>
          </div>
        </div>
      </div>

      {/* FAQ Preview */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          <div>
            <h3 className="font-semibold mb-2">What happens after my trial?</h3>
            <p className="text-sm text-muted-foreground">
              After your 14-day free trial, you'll be automatically enrolled in your
              selected plan. You can cancel anytime before the trial ends.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I change plans later?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Changes take
              effect immediately, with prorated billing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What counts as a document?</h3>
            <p className="text-sm text-muted-foreground">
              Each file you sync from Dropbox or upload counts as one document,
              regardless of page count. Re-syncing the same file doesn't count again.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Is my data secure?</h3>
            <p className="text-sm text-muted-foreground">
              Absolutely. We use bank-level 256-bit encryption, are SOC 2 compliant,
              and never share your data. Your documents are your documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
