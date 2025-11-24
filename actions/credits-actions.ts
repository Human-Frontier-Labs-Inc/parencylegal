"use server";

// TODO: Phase 2+ - Implement complete credit system
// This is a stub implementation for Phase 1 deployment
// The full implementation is in credits-actions.ts.backup

import { auth } from "@clerk/nextjs/server";

/**
 * Stub implementation - Returns success for Phase 1
 * Full credit system will be implemented in Phase 2+
 */
export async function getCreditStatus() {
  const { userId } = auth();

  if (!userId) {
    return {
      hasCredits: false,
      remaining: 0,
      total: 0,
      used: 0,
      error: "Not authenticated"
    };
  }

  // Stub: Return unlimited credits for Phase 1
  return {
    hasCredits: true,
    remaining: 1000,
    total: 1000,
    used: 0,
    error: null
  };
}

/**
 * Stub implementation - Always returns true for Phase 1
 */
export async function hasCreditsAvailable(requiredCredits: number = 1) {
  return {
    hasCredits: true,
    profile: null,
    error: null
  };
}

/**
 * Stub implementation - No-op for Phase 1
 */
export async function useCredits(creditsToUse: number, description: string) {
  const { userId } = auth();

  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  // Stub: Always succeeds in Phase 1
  return { success: true, error: null };
}

/**
 * Stub implementation - Always returns 1000 for Phase 1
 */
export async function getRemainingCredits() {
  const { userId } = auth();

  if (!userId) {
    return 0;
  }

  // Stub: Return 1000 credits for Phase 1
  return 1000;
}

/**
 * Stub implementation - Returns false (not limited) for Phase 1
 */
export async function hasReachedLimit() {
  return false;
}

/**
 * Stub wrapper - Executes feature without credit checks in Phase 1
 */
export async function withPremiumFeature<T>(
  featureFunction: () => Promise<T>,
  options?: {
    creditsRequired?: number;
    featureName?: string;
  }
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const { userId } = auth();

  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Stub: Execute without credit checks in Phase 1
    const data = await featureFunction();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
