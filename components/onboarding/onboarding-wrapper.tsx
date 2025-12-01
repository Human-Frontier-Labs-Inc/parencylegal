/**
 * Onboarding Wrapper Component
 * Client-side wrapper that fetches initial data for onboarding
 */
"use client";

import { useEffect, useState } from "react";
import OnboardingWizard from "./onboarding-wizard";

interface OnboardingWrapperProps {
  userId: string;
}

export default function OnboardingWrapper({ userId }: OnboardingWrapperProps) {
  const [hasCases, setHasCases] = useState<boolean | null>(null);
  const [hasDropbox, setHasDropbox] = useState(false);

  useEffect(() => {
    // Check if user has any cases
    const checkCases = async () => {
      try {
        const response = await fetch("/api/cases");
        if (response.ok) {
          const data = await response.json();
          const cases = data.cases || [];
          setHasCases(cases.length > 0);
        } else {
          setHasCases(false);
        }
      } catch {
        setHasCases(false);
      }
    };

    // Check Dropbox status
    const checkDropbox = async () => {
      try {
        const response = await fetch("/api/auth/dropbox/status");
        if (response.ok) {
          const data = await response.json();
          setHasDropbox(data.connected);
        }
      } catch {
        setHasDropbox(false);
      }
    };

    checkCases();
    checkDropbox();
  }, []);

  // Don't render until we know the case status
  if (hasCases === null) {
    return null;
  }

  return (
    <OnboardingWizard
      userId={userId}
      hasDropboxConnected={hasDropbox}
      hasCases={hasCases}
    />
  );
}
