import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { profilesTable } from "./schema/profiles-schema";
import { casesTable } from "./schema/cases-schema";
import { documentsTable } from "./schema/documents-schema";
import { discoveryRequestsTable } from "./schema/discovery-requests-schema";
import { documentRequestMappingsTable } from "./schema/document-request-mappings-schema";
import { aiChatSessionsTable } from "./schema/ai-chat-sessions-schema";
import { syncHistoryTable } from "./schema/sync-history-schema";
import { dropboxConnectionsTable } from "./schema/dropbox-connections-schema";
import { documentProcessingQueueTable } from "./schema/document-processing-queue-schema";
import { env } from "@/lib/env";

// Define the schema properly
const schema = {
  profiles: profilesTable,
  cases: casesTable,
  documents: documentsTable,
  discoveryRequests: discoveryRequestsTable,
  documentRequestMappings: documentRequestMappingsTable,
  aiChatSessions: aiChatSessionsTable,
  syncHistory: syncHistoryTable,
  dropboxConnections: dropboxConnectionsTable,
  documentProcessingQueue: documentProcessingQueueTable,
};

// Add connection options with improved timeout and retry settings for Vercel environment
const connectionOptions = {
  max: 10,              // Increased from 3 for better concurrency
  idle_timeout: 20,     // Increased from 10
  connect_timeout: 10,  // Increased from 5
  prepare: false,       // Disable prepared statements
  keepalive: true,      // Keep connections alive
  debug: false,         // Disable debug logging in production
  connection: {
    application_name: "parency-lawyer-app" // Identify app in Supabase logs
  }
};

// Create a postgres client with optimized connection options
export const client = postgres(env.DATABASE_URL, connectionOptions);

// Create a drizzle client
export const db = drizzle(client, { schema });

// Export a function to check the database connection health
export async function checkDatabaseConnection(): Promise<{ ok: boolean, message: string }> {
  try {
    // Attempt a simple query with a shorter timeout
    const startTime = Date.now();
    await Promise.race([
      client`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 2000))
    ]);
    const duration = Date.now() - startTime;
    return { 
      ok: true, 
      message: `Database connection successful (${duration}ms)` 
    };
  } catch (error) {
    console.error("Database connection check failed:", error);
    
    // Return detailed error information
    const message = error instanceof Error 
      ? `Connection error: ${error.message}`
      : "Unknown connection error";
      
    return { ok: false, message };
  }
}

// Function to check and log connection status
export async function logDatabaseConnectionStatus(): Promise<void> {
  try {
    const status = await checkDatabaseConnection();
    if (status.ok) {
      console.log(status.message);
    } else {
      console.error(status.message);
    }
  } catch (error) {
    console.error("Failed to check database connection:", error);
  }
}
