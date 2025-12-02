/**
 * Discovery Request Management
 * Phase 8: Discovery Request Tracking
 *
 * CRUD operations for discovery requests
 */

import { db } from "@/db/db";
import { discoveryRequestsTable } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { detectCategoryFromText } from "./category-detection";

export interface CreateDiscoveryRequestInput {
  caseId: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint?: string;
  notes?: string;
}

export interface UpdateDiscoveryRequestInput {
  text?: string;
  categoryHint?: string;
  notes?: string;
  status?: "incomplete" | "complete" | "partial";
  completionPercentage?: number;
}

/**
 * Create a new discovery request
 */
export async function createDiscoveryRequest(
  input: CreateDiscoveryRequestInput,
  userId: string
) {
  // Auto-detect category if not provided
  const categoryHint = input.categoryHint || detectCategoryFromText(input.text);

  const [request] = await db
    .insert(discoveryRequestsTable)
    .values({
      caseId: input.caseId,
      userId,
      type: input.type,
      number: input.number,
      text: input.text,
      categoryHint,
      notes: input.notes || null,
      status: "incomplete",
      completionPercentage: 0,
    })
    .returning();

  return request;
}

/**
 * Get all discovery requests for a case
 */
export async function getDiscoveryRequests(caseId: string, userId: string) {
  const requests = await db
    .select()
    .from(discoveryRequestsTable)
    .where(
      and(
        eq(discoveryRequestsTable.caseId, caseId),
        eq(discoveryRequestsTable.userId, userId)
      )
    )
    .orderBy(asc(discoveryRequestsTable.type), asc(discoveryRequestsTable.number));

  return requests;
}

/**
 * Get a single discovery request by ID
 */
export async function getDiscoveryRequest(requestId: string, userId: string) {
  const [request] = await db
    .select()
    .from(discoveryRequestsTable)
    .where(
      and(
        eq(discoveryRequestsTable.id, requestId),
        eq(discoveryRequestsTable.userId, userId)
      )
    );

  return request || null;
}

/**
 * Update a discovery request
 */
export async function updateDiscoveryRequest(
  requestId: string,
  updates: UpdateDiscoveryRequestInput,
  userId: string
) {
  // Validate status if provided
  if (updates.status && !["incomplete", "complete", "partial"].includes(updates.status)) {
    throw new Error(`Invalid status: ${updates.status}`);
  }

  // Validate completion percentage if provided
  if (
    updates.completionPercentage !== undefined &&
    (updates.completionPercentage < 0 || updates.completionPercentage > 100)
  ) {
    throw new Error("Completion percentage must be between 0 and 100");
  }

  const [updated] = await db
    .update(discoveryRequestsTable)
    .set({
      ...(updates.text !== undefined && { text: updates.text }),
      ...(updates.categoryHint !== undefined && { categoryHint: updates.categoryHint }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.completionPercentage !== undefined && {
        completionPercentage: updates.completionPercentage,
      }),
    })
    .where(
      and(
        eq(discoveryRequestsTable.id, requestId),
        eq(discoveryRequestsTable.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Request not found or not authorized");
  }

  return updated;
}

/**
 * Delete a discovery request
 */
export async function deleteDiscoveryRequest(
  requestId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(discoveryRequestsTable)
    .where(
      and(
        eq(discoveryRequestsTable.id, requestId),
        eq(discoveryRequestsTable.userId, userId)
      )
    )
    .returning({ id: discoveryRequestsTable.id });

  return result.length > 0;
}

/**
 * Get the next available request number for a type
 */
export async function getNextRequestNumber(
  caseId: string,
  type: "RFP" | "Interrogatory",
  userId: string
): Promise<number> {
  const [highest] = await db
    .select({ number: discoveryRequestsTable.number })
    .from(discoveryRequestsTable)
    .where(
      and(
        eq(discoveryRequestsTable.caseId, caseId),
        eq(discoveryRequestsTable.type, type),
        eq(discoveryRequestsTable.userId, userId)
      )
    )
    .orderBy(desc(discoveryRequestsTable.number))
    .limit(1);

  return (highest?.number || 0) + 1;
}

/**
 * Delete all discovery requests for a case
 */
export async function deleteAllDiscoveryRequestsForCase(
  caseId: string,
  userId: string
): Promise<number> {
  const result = await db
    .delete(discoveryRequestsTable)
    .where(
      and(
        eq(discoveryRequestsTable.caseId, caseId),
        eq(discoveryRequestsTable.userId, userId)
      )
    )
    .returning({ id: discoveryRequestsTable.id });

  return result.length;
}

/**
 * Check if a request number already exists
 */
export async function requestNumberExists(
  caseId: string,
  type: "RFP" | "Interrogatory",
  number: number,
  userId: string
): Promise<boolean> {
  const [existing] = await db
    .select({ id: discoveryRequestsTable.id })
    .from(discoveryRequestsTable)
    .where(
      and(
        eq(discoveryRequestsTable.caseId, caseId),
        eq(discoveryRequestsTable.type, type),
        eq(discoveryRequestsTable.number, number),
        eq(discoveryRequestsTable.userId, userId)
      )
    )
    .limit(1);

  return !!existing;
}

/**
 * Get summary statistics for discovery requests
 */
export async function getDiscoveryStats(caseId: string, userId: string) {
  const requests = await getDiscoveryRequests(caseId, userId);

  const stats = {
    total: requests.length,
    rfpCount: requests.filter((r) => r.type === "RFP").length,
    interrogatoryCount: requests.filter((r) => r.type === "Interrogatory").length,
    complete: requests.filter((r) => r.status === "complete").length,
    partial: requests.filter((r) => r.status === "partial").length,
    incomplete: requests.filter((r) => r.status === "incomplete").length,
    averageCompletion:
      requests.length > 0
        ? Math.round(
            requests.reduce((sum, r) => sum + (r.completionPercentage || 0), 0) /
              requests.length
          )
        : 0,
  };

  return stats;
}
