/**
 * Dropbox OAuth Service
 * Handles OAuth flow, token management, and API authentication
 */

import { Dropbox, DropboxAuth } from 'dropbox';

// Types
export interface DropboxTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  account_id: string;
}

export interface DropboxAccountInfo {
  accountId: string;
  email: string;
  displayName: string;
}

// Environment configuration
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || '';
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET || '';

// State storage for CSRF protection (in production, use Redis or database)
const stateStore = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Generate a Dropbox authorization URL with PKCE and state
 */
export async function generateDropboxAuthUrl(
  userId: string,
  redirectUri: string
): Promise<string> {
  if (!DROPBOX_APP_KEY) {
    throw new Error('DROPBOX_APP_KEY is not configured');
  }

  const dbxAuth = new DropboxAuth({
    clientId: DROPBOX_APP_KEY,
    clientSecret: DROPBOX_APP_SECRET,
  });

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state with expiration (10 minutes)
  stateStore.set(state, {
    userId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Clean up expired states
  cleanupExpiredStates();

  const authUrl = await dbxAuth.getAuthenticationUrl(
    redirectUri,
    state,
    'code',
    'offline', // Request refresh token
    undefined,
    undefined,
    true // Use PKCE
  );

  return authUrl.toString();
}

/**
 * Validate state parameter and return associated userId
 */
export function validateState(state: string): string | null {
  const stateData = stateStore.get(state);

  if (!stateData) {
    return null;
  }

  // Check if expired
  if (Date.now() > stateData.expiresAt) {
    stateStore.delete(state);
    return null;
  }

  // Delete state after use (one-time use)
  stateStore.delete(state);

  return stateData.userId;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeDropboxCode(
  code: string,
  redirectUri: string
): Promise<DropboxTokens> {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    throw new Error('Dropbox credentials not configured');
  }

  const dbxAuth = new DropboxAuth({
    clientId: DROPBOX_APP_KEY,
    clientSecret: DROPBOX_APP_SECRET,
  });

  try {
    const response = await dbxAuth.getAccessTokenFromCode(redirectUri, code);

    const result = response.result as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      account_id: string;
    };

    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
      token_type: result.token_type,
      account_id: result.account_id,
    };
  } catch (error: any) {
    console.error('Dropbox token exchange error:', error);

    if (error.status === 400) {
      throw new Error('Invalid authorization code');
    }
    if (error.status === 429) {
      throw new Error('Rate limited');
    }

    throw new Error('Failed to exchange authorization code');
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshDropboxToken(refreshToken: string): Promise<DropboxTokens> {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    throw new Error('Dropbox credentials not configured');
  }

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const dbxAuth = new DropboxAuth({
    clientId: DROPBOX_APP_KEY,
    clientSecret: DROPBOX_APP_SECRET,
    refreshToken,
  });

  try {
    await dbxAuth.refreshAccessToken();

    const accessToken = dbxAuth.getAccessToken();
    const expiresAt = dbxAuth.getAccessTokenExpiresAt();

    if (!accessToken) {
      throw new Error('Failed to refresh access token');
    }

    // Calculate expires_in from expiresAt
    const expiresIn = expiresAt
      ? Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      : 14400; // Default 4 hours

    return {
      access_token: accessToken,
      refresh_token: refreshToken, // Keep the same refresh token
      expires_in: expiresIn,
      token_type: 'bearer',
      account_id: '', // Will be populated from existing connection
    };
  } catch (error: any) {
    console.error('Dropbox token refresh error:', error);
    throw new Error('Failed to refresh Dropbox token');
  }
}

/**
 * Get Dropbox account info using access token
 */
export async function getDropboxAccountInfo(accessToken: string): Promise<DropboxAccountInfo> {
  const dbx = new Dropbox({ accessToken });

  try {
    const response = await dbx.usersGetCurrentAccount();

    return {
      accountId: response.result.account_id,
      email: response.result.email,
      displayName: response.result.name.display_name,
    };
  } catch (error: any) {
    console.error('Failed to get Dropbox account info:', error);
    throw new Error('Failed to get Dropbox account info');
  }
}

/**
 * Revoke Dropbox access token
 */
export async function revokeDropboxToken(accessToken: string): Promise<boolean> {
  const dbx = new Dropbox({ accessToken });

  try {
    await dbx.authTokenRevoke();
    return true;
  } catch (error: any) {
    console.error('Failed to revoke Dropbox token:', error);
    // Return true even on error - token might already be invalid
    return true;
  }
}

/**
 * Verify if a Dropbox connection is still valid
 */
export async function verifyDropboxConnection(accessToken: string): Promise<boolean> {
  const dbx = new Dropbox({ accessToken });

  try {
    await dbx.usersGetCurrentAccount();
    return true;
  } catch (error: any) {
    if (error.status === 401) {
      return false; // Token is invalid/expired
    }
    console.error('Failed to verify Dropbox connection:', error);
    return false;
  }
}

/**
 * Create an authenticated Dropbox client
 */
export function createDropboxClient(accessToken: string): Dropbox {
  return new Dropbox({ accessToken });
}

/**
 * Clean up expired states from memory
 */
function cleanupExpiredStates(): void {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now > data.expiresAt) {
      stateStore.delete(state);
    }
  }
}

/**
 * Simple encryption for token storage (in production, use proper encryption)
 * This is a placeholder - implement proper AES-256 encryption
 */
export function encryptToken(token: string): string {
  // TODO: Implement proper encryption using crypto
  // For now, base64 encode (NOT SECURE - replace in production)
  return Buffer.from(token).toString('base64');
}

/**
 * Decrypt stored token
 */
export function decryptToken(encryptedToken: string): string {
  // TODO: Implement proper decryption
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}
