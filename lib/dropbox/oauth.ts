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

/**
 * Generate state data for OAuth flow
 * State contains userId encoded with a timestamp for validation
 */
export function generateStateData(userId: string): string {
  const timestamp = Date.now();
  const data = JSON.stringify({ userId, timestamp });
  // Simple encoding - in production use proper encryption
  return Buffer.from(data).toString('base64url');
}

/**
 * Validate and decode state parameter
 * Returns userId if valid and not expired (10 minute window)
 */
export function validateStateData(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    const data = JSON.parse(decoded);

    // Check if state is expired (10 minutes)
    const expirationMs = 10 * 60 * 1000;
    if (Date.now() - data.timestamp > expirationMs) {
      return null;
    }

    return data.userId || null;
  } catch {
    return null;
  }
}

/**
 * Generate a Dropbox authorization URL
 * Using direct URL building instead of SDK to avoid serverless issues
 */
export function generateDropboxAuthUrl(
  userId: string,
  redirectUri: string
): string {
  if (!DROPBOX_APP_KEY) {
    throw new Error('DROPBOX_APP_KEY is not configured');
  }

  // Generate state containing userId for CSRF protection
  const state = generateStateData(userId);

  // Build authorization URL directly
  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    redirect_uri: redirectUri,
    response_type: 'code',
    token_access_type: 'offline', // Request refresh token
    state: state,
  });

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Validate state parameter and return associated userId
 */
export function validateState(state: string): string | null {
  return validateStateData(state);
}

/**
 * Exchange authorization code for tokens
 * Using direct fetch instead of Dropbox SDK to avoid serverless issues
 */
export async function exchangeDropboxCode(
  code: string,
  redirectUri: string
): Promise<DropboxTokens> {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    throw new Error('Dropbox credentials not configured');
  }

  try {
    // Use direct fetch API instead of Dropbox SDK
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dropbox token exchange failed:', response.status, errorText);

      if (response.status === 400) {
        throw new Error('Invalid authorization code');
      }
      if (response.status === 429) {
        throw new Error('Rate limited');
      }
      throw new Error('Token exchange failed: ' + errorText);
    }

    const result = await response.json();

    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
      token_type: result.token_type,
      account_id: result.account_id,
    };
  } catch (error: any) {
    console.error('Dropbox token exchange error:', error);
    throw error;
  }
}

/**
 * Refresh an expired access token
 * Using direct fetch instead of Dropbox SDK to avoid serverless issues
 */
export async function refreshDropboxToken(refreshToken: string): Promise<DropboxTokens> {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    throw new Error('Dropbox credentials not configured');
  }

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dropbox token refresh failed:', response.status, errorText);
      throw new Error('Failed to refresh Dropbox token');
    }

    const result = await response.json();

    return {
      access_token: result.access_token,
      refresh_token: refreshToken, // Keep the same refresh token (Dropbox doesn't return a new one)
      expires_in: result.expires_in || 14400,
      token_type: result.token_type || 'bearer',
      account_id: '', // Will be populated from existing connection
    };
  } catch (error: any) {
    console.error('Dropbox token refresh error:', error);
    throw new Error('Failed to refresh Dropbox token');
  }
}

/**
 * Get Dropbox account info using access token
 * Using direct fetch instead of SDK
 */
export async function getDropboxAccountInfo(accessToken: string): Promise<DropboxAccountInfo> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: 'null', // Dropbox requires a body even if empty
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get Dropbox account info:', response.status, errorText);
      throw new Error('Failed to get Dropbox account info');
    }

    const result = await response.json();

    return {
      accountId: result.account_id,
      email: result.email,
      displayName: result.name.display_name,
    };
  } catch (error: any) {
    console.error('Failed to get Dropbox account info:', error);
    throw new Error('Failed to get Dropbox account info');
  }
}

/**
 * Revoke Dropbox access token
 * Using direct fetch API for serverless compatibility
 */
export async function revokeDropboxToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // 200 = success, 401 = already revoked/invalid
    return response.ok || response.status === 401;
  } catch (error: any) {
    console.error('Failed to revoke Dropbox token:', error);
    // Return true even on error - token might already be invalid
    return true;
  }
}

/**
 * Verify if a Dropbox connection is still valid
 * Using direct fetch API for serverless compatibility
 */
export async function verifyDropboxConnection(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: 'null',
    });

    return response.ok;
  } catch (error: any) {
    console.error('Failed to verify Dropbox connection:', error);
    return false;
  }
}

/**
 * Create an authenticated Dropbox client
 * NOTE: Avoid using this in serverless - use direct fetch instead
 * @deprecated Use direct fetch API calls instead for serverless compatibility
 */
export function createDropboxClient(accessToken: string): Dropbox {
  console.warn('createDropboxClient is deprecated in serverless environments');
  return new Dropbox({ accessToken });
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
