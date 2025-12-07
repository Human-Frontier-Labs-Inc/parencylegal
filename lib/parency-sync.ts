/**
 * CoParency Parent Sync API Client
 * Fetches data from the parent app (Parencyparent) using access tokens
 */

const PARENCY_API_URL = process.env.PARENCY_PARENT_API_URL || 'https://coparency.humanfrontiertests.com';

export interface ParentInfo {
  name: string;
  email: string;
}

export interface Family {
  id: string;
  name: string;
}

export interface Incident {
  id: string;
  familyId: string;
  category: string;
  description: string;
  severity: string;
  occurredAt: string;
  loggedAt: string;
  isPrivate: boolean;
  aiSummary: string | null;
  childName: string | null;
  photos: { url: string; fileName: string }[];
}

export interface Expense {
  id: string;
  familyId: string;
  description: string;
  amount: string;
  category: string;
  paidOn: string;
  splitPercentage: string;
  reimbursementStatus: string;
  childName: string | null;
  receiptUrl: string | null;
}

export interface CalendarSchedule {
  id: string;
  familyId: string;
  startDate: string;
  cycleLength: number;
  pattern: string[];
  templateId: string;
  overrides: { date: string; reason: string }[];
}

export interface Message {
  id: string;
  familyId: string;
  content: string;
  createdAt: string;
  hasAttachment: boolean;
  attachmentName: string | null;
  attachmentType: string | null;
}

export interface ParencySyncData {
  parent: ParentInfo;
  sharing: {
    includePrivateIncidents: boolean;
  };
  families: Family[];
  data: {
    incidents: Incident[];
    expenses: Expense[];
    calendar: CalendarSchedule[];
    messages: Message[];
  };
  fetchedAt: string;
}

export type DataType = 'incidents' | 'expenses' | 'calendar' | 'messages';

export class ParencySyncError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: 'invalid_token' | 'revoked' | 'network' | 'server' | 'unknown'
  ) {
    super(message);
    this.name = 'ParencySyncError';
  }
}

/**
 * Validate a parent token by calling the API
 * Returns parent info if valid, throws ParencySyncError if not
 */
export async function validateParentToken(token: string): Promise<{ parent: ParentInfo; families: Family[] }> {
  try {
    const response = await fetch(`${PARENCY_API_URL}/api/lawyer-sync/data?types=`, {
      method: 'GET',
      headers: {
        'X-Lawyer-Sync-Token': token,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const error = await response.json().catch(() => ({ error: 'Invalid token' }));
        const isRevoked = error.error?.toLowerCase().includes('revoked');
        throw new ParencySyncError(
          error.error || 'Invalid or revoked token',
          401,
          isRevoked ? 'revoked' : 'invalid_token'
        );
      }
      throw new ParencySyncError(
        'Failed to validate token',
        response.status,
        response.status >= 500 ? 'server' : 'unknown'
      );
    }

    const data: ParencySyncData = await response.json();
    return {
      parent: data.parent,
      families: data.families,
    };
  } catch (error) {
    if (error instanceof ParencySyncError) {
      throw error;
    }
    throw new ParencySyncError(
      'Network error connecting to parent app',
      0,
      'network'
    );
  }
}

/**
 * Fetch parent data using an access token
 * @param token - The 64-char hex access token
 * @param types - Optional array of data types to fetch (default: all)
 * @param since - Optional ISO timestamp for incremental sync
 */
export async function fetchParentData(
  token: string,
  types?: DataType[],
  since?: string
): Promise<ParencySyncData> {
  try {
    const params = new URLSearchParams();
    if (types && types.length > 0) {
      params.set('types', types.join(','));
    }
    if (since) {
      params.set('since', since);
    }

    const url = `${PARENCY_API_URL}/api/lawyer-sync/data${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Lawyer-Sync-Token': token,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const error = await response.json().catch(() => ({ error: 'Invalid token' }));
        const isRevoked = error.error?.toLowerCase().includes('revoked');
        throw new ParencySyncError(
          error.error || 'Invalid or revoked token',
          401,
          isRevoked ? 'revoked' : 'invalid_token'
        );
      }
      if (response.status === 400) {
        const error = await response.json().catch(() => ({ error: 'Bad request' }));
        throw new ParencySyncError(error.error || 'Invalid request', 400, 'unknown');
      }
      throw new ParencySyncError(
        'Failed to fetch parent data',
        response.status,
        response.status >= 500 ? 'server' : 'unknown'
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ParencySyncError) {
      throw error;
    }
    throw new ParencySyncError(
      'Network error connecting to parent app',
      0,
      'network'
    );
  }
}
