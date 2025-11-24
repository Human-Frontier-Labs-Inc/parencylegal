"use server";

// TODO: Phase 2+ - Implement pending profiles system if needed
// This is a stub implementation for Phase 1 deployment

/**
 * Stub implementations for pending profiles
 * Full implementation in pending-profiles-actions.ts.backup
 */

export async function getPendingProfileByEmailAction(email: string) {
  return null;
}

export async function createPendingProfileAction(email: string, usageType: string) {
  return { success: false, error: "Feature not implemented in Phase 1" };
}

export async function markPendingProfileAsClaimedAction(email: string, userId: string) {
  return { success: false, error: "Feature not implemented in Phase 1" };
}

export async function deletePendingProfileAction(email: string) {
  return { success: false, error: "Feature not implemented in Phase 1" };
}
