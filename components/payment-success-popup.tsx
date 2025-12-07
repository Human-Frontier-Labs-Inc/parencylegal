/**
 * Payment Success Popup Component
 * Appears after a successful payment
 * Displays the user's new plan details and document limits
 * Shows confetti celebration animation
 *
 * IMPORTANT: This component fetches plan details directly from Stripe
 * using the session_id, rather than relying on database which may not
 * be updated yet (webhook race condition).
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, FileText, Sparkles, RefreshCw, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "motion/react";
import { SelectProfile } from "@/db/schema/profiles-schema";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from 'canvas-confetti';

interface PaymentSuccessPopupProps {
  profile: SelectProfile;
}

// Plan configuration for display
const PLAN_CONFIG = {
  solo: {
    name: "Solo",
    documentLimit: 500,
    seatsLimit: 1,
    features: [
      "Up to 50 active cases",
      "500 documents/month",
      "AI document classification",
      "Dropbox sync",
      "Email support"
    ]
  },
  small_firm: {
    name: "Small Firm",
    documentLimit: 2000,
    seatsLimit: 5,
    features: [
      "Unlimited active cases",
      "2,000 documents/month",
      "5 team member seats",
      "Priority AI processing",
      "Advanced analytics",
      "Priority support"
    ]
  },
  enterprise: {
    name: "Enterprise",
    documentLimit: 999999,
    seatsLimit: 999,
    features: [
      "Unlimited active cases",
      "Unlimited documents",
      "Unlimited team members",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantees"
    ]
  },
  trial: {
    name: "Trial",
    documentLimit: 100,
    seatsLimit: 1,
    features: [
      "Limited cases",
      "100 documents/month",
      "Basic features"
    ]
  }
} as const;

type MembershipType = keyof typeof PLAN_CONFIG;

interface StripeSessionDetails {
  sessionId: string;
  customerId: string;
  subscriptionId: string;
  membership: string;
  productName: string;
  priceId: string;
  planDuration: string;
  billingCycleEnd: string;
}

export default function PaymentSuccessPopup({ profile: initialProfile }: PaymentSuccessPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const confettiShown = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Plan details state - populated from Stripe session
  const [planDetails, setPlanDetails] = useState<{
    membership: MembershipType;
    planDuration: string;
    billingCycleEnd: string | null;
  }>({
    membership: (initialProfile.membership || "solo") as MembershipType,
    planDuration: initialProfile.planDuration || "monthly",
    billingCycleEnd: initialProfile.billingCycleEnd?.toISOString() || null
  });

  // Get plan configuration based on membership
  const planConfig = PLAN_CONFIG[planDetails.membership] || PLAN_CONFIG.solo;

  // Fetch plan details from Stripe session
  const fetchStripeSessionDetails = async (sessionId: string): Promise<boolean> => {
    try {
      console.log(`[POPUP] Fetching Stripe session details for: ${sessionId}`);

      const response = await fetch(`/api/stripe/session-details?session_id=${sessionId}`);

      if (!response.ok) {
        console.error(`[POPUP] Failed to fetch session details: ${response.status}`);
        return false;
      }

      const data: StripeSessionDetails = await response.json();
      console.log(`[POPUP] Got session details:`, data);

      // Update plan details from Stripe (authoritative source)
      setPlanDetails({
        membership: (data.membership || "solo") as MembershipType,
        planDuration: data.planDuration || "monthly",
        billingCycleEnd: data.billingCycleEnd || null
      });

      return true;
    } catch (error) {
      console.error("[POPUP] Error fetching session details:", error);
      return false;
    }
  };

  // Set this popup as the active popup when shown
  useEffect(() => {
    if (isOpen) {
      try {
        localStorage.setItem('active_popup', 'payment_success');
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    }

    return () => {
      if (!isOpen) {
        try {
          const activePopup = localStorage.getItem('active_popup');
          if (activePopup === 'payment_success') {
            localStorage.removeItem('active_popup');
          }
        } catch (error) {
          console.error('Error accessing localStorage:', error);
        }
      }
    };
  }, [isOpen]);

  // Main effect - handle payment success
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success' && !confettiShown.current) {
      console.log(`[POPUP] Payment success detected. session_id: ${sessionId}`);

      try {
        localStorage.setItem('active_popup', 'payment_success');
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }

      const initializePopup = async () => {
        setIsLoading(true);

        // If we have a session_id, fetch details directly from Stripe
        // This is the RELIABLE way to get plan info (no webhook race condition)
        if (sessionId) {
          const success = await fetchStripeSessionDetails(sessionId);
          if (success) {
            console.log(`[POPUP] Successfully fetched plan details from Stripe`);
          } else {
            console.warn(`[POPUP] Could not fetch from Stripe, using profile data`);
            // Fall back to profile data (may still be "trial" if webhook hasn't fired)
            setPlanDetails({
              membership: (initialProfile.membership !== "trial" ? initialProfile.membership : "solo") as MembershipType,
              planDuration: initialProfile.planDuration || "monthly",
              billingCycleEnd: initialProfile.billingCycleEnd?.toISOString() || null
            });
          }
        } else {
          console.warn(`[POPUP] No session_id in URL, using profile data`);
          // No session_id - use profile data with optimistic fallback
          setPlanDetails({
            membership: (initialProfile.membership !== "trial" ? initialProfile.membership : "solo") as MembershipType,
            planDuration: initialProfile.planDuration || "monthly",
            billingCycleEnd: initialProfile.billingCycleEnd?.toISOString() || null
          });
        }

        setIsLoading(false);

        // Show the popup with animation
        setTimeout(() => {
          setIsOpen(true);
          if (!confettiShown.current) {
            triggerConfetti();
            confettiShown.current = true;
          }
        }, 500);
      };

      initializePopup();
    }
  }, [searchParams, initialProfile]);

  // Handle closing the popup
  const handleClose = () => {
    setIsOpen(false);

    try {
      const activePopup = localStorage.getItem('active_popup');
      if (activePopup === 'payment_success') {
        localStorage.removeItem('active_popup');
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }

    // Clean up URL - remove payment params
    const currentPath = window.location.pathname;
    router.replace(currentPath);
  };

  // Trigger confetti animation
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("Error triggering confetti:", error);
    }
  };

  // Get plan details for display
  const planType = `${planConfig.name} ${planDetails.planDuration === "yearly" ? "Yearly" : "Monthly"}`;
  const documentLimit = planConfig.documentLimit;
  const seatsLimit = planConfig.seatsLimit;

  // Format renewal date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextRenewal = formatDate(planDetails.billingCycleEnd);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {isOpen && <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40" />}
      <DialogContent className="fixed left-[50%] top-[50%] z-50 w-[420px] translate-x-[-50%] translate-y-[-50%] border-none p-0 shadow-lg rounded-xl bg-transparent [&>button]:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative rounded-xl overflow-hidden bg-white shadow-xl border border-gray-100"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-50 rounded-full w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>

          {isLoading ? (
            // Loading state
            <div className="px-6 py-12 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-600">Loading your plan details...</p>
            </div>
          ) : (
            <>
              {/* Header with success confirmation */}
              <div className="px-6 pt-5 pb-3">
                <div className="flex items-center justify-center mb-3">
                  <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Thank you for subscribing to {planType}
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-5">
                {/* Plan information */}
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                      Your {planConfig.name} Plan is Active!
                    </h4>
                  </div>

                  {/* Document limit */}
                  <div className="flex justify-between items-center mt-3 bg-white rounded-md p-3 border border-purple-100">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-purple-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Documents/month</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">
                      {documentLimit >= 999999 ? "Unlimited" : documentLimit.toLocaleString()}
                    </span>
                  </div>

                  {/* Seats limit */}
                  {seatsLimit > 1 && (
                    <div className="flex justify-between items-center mt-2 bg-white rounded-md p-3 border border-purple-100">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-purple-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Team seats</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {seatsLimit >= 999 ? "Unlimited" : seatsLimit}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border border-purple-100">
                    <span className="block font-medium mb-1">Next billing date</span>
                    {nextRenewal}
                  </div>
                </div>

                {/* What's included list */}
                <div className="mb-5">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Your {planConfig.name} Plan Includes:</h5>
                  <ul className="space-y-2.5">
                    {planConfig.features.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start text-sm text-gray-600"
                      >
                        <div className="rounded-full bg-purple-100 p-0.5 mr-2 mt-0.5 flex-shrink-0">
                          <Check className="w-3 h-3 text-purple-600" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  onClick={handleClose}
                >
                  Get Started
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
