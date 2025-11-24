import { currentUser } from "@clerk/nextjs/server";
import { getProfileByUserId } from "@/db/queries/profiles-queries";
import { createProfileAction } from "@/actions/profiles-actions";

/**
 * Ensures a user profile exists for the authenticated user
 * This function should be called once per user session, not on every request
 *
 * @param userId - The Clerk user ID
 * @returns The user's profile or null if creation failed
 */
export async function ensureProfile(userId: string) {
  try {
    // Check if profile already exists
    const existingProfile = await getProfileByUserId(userId);

    if (existingProfile) {
      return existingProfile;
    }

    // Profile doesn't exist, create it
    console.log(`Creating new profile for user ${userId}`);

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    const result = await createProfileAction({
      userId,
      email
    });

    if (!result.success) {
      console.error(`Failed to create profile for user ${userId}:`, result.error);
      return null;
    }

    console.log(`Successfully created profile for user ${userId}`);
    return result.data;
  } catch (error) {
    console.error(`Error ensuring profile for user ${userId}:`, error);
    return null;
  }
}
