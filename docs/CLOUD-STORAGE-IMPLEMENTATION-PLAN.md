# Cloud Storage Integration Implementation Plan
## OneDrive & Dropbox Abstraction Layer

**Version:** 1.0
**Created:** December 2, 2025
**Methodology:** Test-Driven Development (TDD)
**Estimated Duration:** 5 Phases

---

## Executive Summary

This plan outlines a phased approach to:
1. Abstract the existing Dropbox integration into a reusable cloud storage provider pattern
2. Implement OneDrive integration following the same pattern
3. Create a unified UI for managing multiple cloud storage connections

**Current State:** Dropbox integration is ~90% complete with OAuth, folder browsing, and search capabilities.

**Target State:** A provider-agnostic cloud storage layer supporting Dropbox and OneDrive (extensible to Google Drive, Box, etc.).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Components                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ ConnectionCard  │  │  FolderPicker   │  │   FileBrowser   │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┴────────────────────┘            │
│                                │                                 │
├────────────────────────────────┼─────────────────────────────────┤
│                     Provider Abstraction                         │
│                                │                                 │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │              CloudStorageProvider (Interface)              │  │
│  │  - connect() / disconnect()                                │  │
│  │  - listFolders() / searchFolders()                        │  │
│  │  - getFile() / downloadFile()                             │  │
│  │  - getConnectionStatus()                                   │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                │                                 │
│           ┌────────────────────┼────────────────────┐           │
│           │                    │                    │           │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐ │
│  │DropboxProvider  │  │ OneDriveProvider│  │ GoogleProvider  │ │
│  │   (Existing)    │  │    (New)        │  │   (Future)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                        Database Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │dropbox_connections│ │onedrive_connections││cloud_connections│ │
│  │   (Existing)    │  │    (New)         │ │  (Unified view) │  │
│  └─────────────────┘  └──────────────────┘ └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Provider Abstraction Layer (Foundation)

**Goal:** Create a type-safe, provider-agnostic interface that abstracts cloud storage operations.

**Duration:** ~1 day

### 1.1 Tests First (TDD)

**File:** `tests/cloud-storage/provider-interface.test.ts`

```typescript
// Tests to write BEFORE implementation:

describe('CloudStorageProvider Interface', () => {
  describe('Provider Types', () => {
    it('should define all supported provider types', () => {
      expect(CloudStorageProviderType).toContain('dropbox');
      expect(CloudStorageProviderType).toContain('onedrive');
    });
  });

  describe('Connection Interface', () => {
    it('should have required connection fields', () => {
      const connection: CloudStorageConnection = {
        id: 'test-id',
        userId: 'user-123',
        provider: 'dropbox',
        providerAccountId: 'account-123',
        providerEmail: 'test@example.com',
        providerDisplayName: 'Test User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(connection).toBeDefined();
    });
  });

  describe('Folder Interface', () => {
    it('should normalize folder structure across providers', () => {
      const folder: CloudStorageFolder = {
        id: 'folder-123',
        name: 'Documents',
        path: '/documents',
        pathDisplay: '/Documents',
        provider: 'dropbox',
      };
      expect(folder.provider).toBeDefined();
    });
  });

  describe('File Interface', () => {
    it('should include common file metadata', () => {
      const file: CloudStorageFile = {
        id: 'file-123',
        name: 'contract.pdf',
        path: '/documents/contract.pdf',
        pathDisplay: '/Documents/contract.pdf',
        size: 1024000,
        mimeType: 'application/pdf',
        modifiedAt: new Date(),
        provider: 'dropbox',
        downloadable: true,
      };
      expect(file.mimeType).toBeDefined();
    });
  });

  describe('Provider Factory', () => {
    it('should create Dropbox provider', () => {
      const provider = CloudStorageProviderFactory.create('dropbox');
      expect(provider).toBeInstanceOf(DropboxProvider);
    });

    it('should create OneDrive provider', () => {
      const provider = CloudStorageProviderFactory.create('onedrive');
      expect(provider).toBeInstanceOf(OneDriveProvider);
    });

    it('should throw for unsupported provider', () => {
      expect(() => CloudStorageProviderFactory.create('unknown' as any))
        .toThrow('Unsupported provider');
    });
  });
});
```

### 1.2 Implementation

**Files to create:**
- `lib/cloud-storage/types.ts` - Type definitions
- `lib/cloud-storage/provider-interface.ts` - Abstract provider interface
- `lib/cloud-storage/provider-factory.ts` - Factory for creating providers
- `lib/cloud-storage/index.ts` - Public exports

### 1.3 Deliverables

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Type Definitions | All shared types for cloud storage | Types compile, are exported |
| Provider Interface | Abstract class/interface | Defines all required methods |
| Provider Factory | Factory function | Creates correct provider instances |
| Unit Tests | Test suite for abstraction | All tests pass |

---

## Phase 2: Refactor Dropbox to Provider Pattern

**Goal:** Migrate existing Dropbox implementation to use the new provider abstraction without breaking existing functionality.

**Duration:** ~1 day

### 2.1 Tests First (TDD)

**File:** `tests/cloud-storage/dropbox-provider.test.ts`

```typescript
describe('DropboxProvider', () => {
  let provider: DropboxProvider;

  beforeEach(() => {
    provider = new DropboxProvider();
  });

  describe('implements CloudStorageProvider', () => {
    it('should implement all required methods', () => {
      expect(provider.getAuthUrl).toBeDefined();
      expect(provider.handleCallback).toBeDefined();
      expect(provider.refreshToken).toBeDefined();
      expect(provider.disconnect).toBeDefined();
      expect(provider.getConnectionStatus).toBeDefined();
      expect(provider.listFolders).toBeDefined();
      expect(provider.searchFolders).toBeDefined();
      expect(provider.getFile).toBeDefined();
      expect(provider.downloadFile).toBeDefined();
    });
  });

  describe('getAuthUrl', () => {
    it('should return Dropbox-specific OAuth URL', async () => {
      const url = await provider.getAuthUrl('user-123', 'http://localhost/callback');
      expect(url).toContain('dropbox.com/oauth2/authorize');
      expect(url).toContain('state=');
    });
  });

  describe('listFolders (normalized)', () => {
    it('should return folders with provider field set', async () => {
      const result = await provider.listFolders('user-123', '/');
      expect(result.folders[0].provider).toBe('dropbox');
    });

    it('should return files with provider field set', async () => {
      const result = await provider.listFolders('user-123', '/');
      expect(result.files[0].provider).toBe('dropbox');
    });
  });

  describe('downloadFile', () => {
    it('should return file content as buffer', async () => {
      const content = await provider.downloadFile('user-123', '/test.pdf');
      expect(content).toBeInstanceOf(Buffer);
    });

    it('should throw for non-existent file', async () => {
      await expect(provider.downloadFile('user-123', '/nonexistent.pdf'))
        .rejects.toThrow('File not found');
    });
  });
});
```

### 2.2 Implementation

**Files to modify/create:**
- `lib/cloud-storage/providers/dropbox/index.ts` - Main Dropbox provider class
- `lib/cloud-storage/providers/dropbox/oauth.ts` - Move from `lib/dropbox/oauth.ts`
- `lib/cloud-storage/providers/dropbox/folders.ts` - Move from `lib/dropbox/folders.ts`
- `lib/cloud-storage/providers/dropbox/files.ts` - New file download capability

**Migration strategy:**
1. Create new provider class that wraps existing functions
2. Add provider field to all returned objects
3. Keep existing API routes working via backward-compatible exports
4. Add `downloadFile` method (currently missing)

### 2.3 Deliverables

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| DropboxProvider Class | Provider implementation | Implements full interface |
| Backward Compatibility | Existing routes work | All existing tests pass |
| File Download | New capability | Can download files from Dropbox |
| Integration Tests | E2E test coverage | Provider works end-to-end |

---

## Phase 3: OneDrive OAuth & Connection

**Goal:** Implement OneDrive authentication and connection management.

**Duration:** ~1.5 days

### 3.1 Azure AD Setup (Prerequisites)

Before coding, the customer needs to:
1. Create Azure AD App Registration
2. Configure redirect URIs
3. Add API permissions: `Files.Read`, `Files.Read.All`, `User.Read`
4. Generate client secret
5. Provide credentials for `.env`

```env
# Required environment variables
ONEDRIVE_CLIENT_ID=your-client-id
ONEDRIVE_CLIENT_SECRET=your-client-secret
ONEDRIVE_REDIRECT_URI=https://app.com/api/auth/onedrive/callback
```

### 3.2 Tests First (TDD)

**File:** `tests/cloud-storage/onedrive-oauth.test.ts`

```typescript
describe('OneDrive OAuth', () => {
  const mockUserId = 'user_test123';
  const mockRedirectUri = 'http://localhost:3000/api/auth/onedrive/callback';

  describe('OAuth URL Generation', () => {
    it('should generate Microsoft identity platform URL', async () => {
      const provider = new OneDriveProvider();
      const url = await provider.getAuthUrl(mockUserId, mockRedirectUri);

      expect(url).toContain('login.microsoftonline.com');
      expect(url).toContain('/oauth2/v2.0/authorize');
    });

    it('should request correct scopes', async () => {
      const provider = new OneDriveProvider();
      const url = await provider.getAuthUrl(mockUserId, mockRedirectUri);

      expect(url).toContain('Files.Read');
      expect(url).toContain('User.Read');
      expect(url).toContain('offline_access');
    });

    it('should include state for CSRF protection', async () => {
      const provider = new OneDriveProvider();
      const url = await provider.getAuthUrl(mockUserId, mockRedirectUri);

      expect(url).toContain('state=');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange code for tokens', async () => {
      const tokens = await exchangeOneDriveCode('valid_code', mockRedirectUri);

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      expect(tokens.expires_in).toBeGreaterThan(0);
    });

    it('should throw for invalid code', async () => {
      await expect(exchangeOneDriveCode('invalid', mockRedirectUri))
        .rejects.toThrow();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh expired tokens', async () => {
      const newTokens = await refreshOneDriveToken('valid_refresh_token');

      expect(newTokens.access_token).toBeDefined();
    });
  });

  describe('Account Info', () => {
    it('should fetch user profile from Microsoft Graph', async () => {
      const info = await getOneDriveAccountInfo('valid_token');

      expect(info.id).toBeDefined();
      expect(info.displayName).toBeDefined();
      expect(info.email).toBeDefined();
    });
  });
});
```

**File:** `tests/cloud-storage/onedrive-connection.test.ts`

```typescript
describe('OneDrive Connection Storage', () => {
  describe('Save Connection', () => {
    it('should save connection to database', async () => {
      const connection = await saveOneDriveConnection(mockUserId, mockTokens);

      expect(connection.userId).toBe(mockUserId);
      expect(connection.provider).toBe('onedrive');
    });

    it('should encrypt tokens before storage', async () => {
      const connection = await saveOneDriveConnection(mockUserId, mockTokens);

      expect(connection.accessToken).not.toBe(mockTokens.access_token);
    });
  });

  describe('Get Connection', () => {
    it('should retrieve connection by userId', async () => {
      const connection = await getOneDriveConnection(mockUserId);

      expect(connection).toBeDefined();
      expect(connection?.isActive).toBe(true);
    });

    it('should return null for non-existent connection', async () => {
      const connection = await getOneDriveConnection('nonexistent');

      expect(connection).toBeNull();
    });
  });
});
```

### 3.3 Implementation

**Database:**
- `db/schema/onedrive-connections-schema.ts` - Mirror of Dropbox schema

**API Routes:**
- `app/api/auth/onedrive/route.ts` - Initiate OAuth
- `app/api/auth/onedrive/callback/route.ts` - Handle callback
- `app/api/auth/onedrive/status/route.ts` - Check connection status

**Library:**
- `lib/cloud-storage/providers/onedrive/oauth.ts` - OAuth functions
- `lib/cloud-storage/providers/onedrive/index.ts` - Provider class

### 3.4 Deliverables

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Database Schema | onedrive_connections table | Migration runs successfully |
| OAuth Flow | Connect/disconnect OneDrive | User can authorize app |
| Token Management | Refresh, store, encrypt | Tokens persist securely |
| API Routes | 3 auth routes | Routes respond correctly |
| Unit Tests | OAuth test suite | All tests pass |

---

## Phase 4: OneDrive Folder & File Operations

**Goal:** Implement folder browsing, search, and file operations for OneDrive.

**Duration:** ~1.5 days

### 4.1 Tests First (TDD)

**File:** `tests/cloud-storage/onedrive-folders.test.ts`

```typescript
describe('OneDrive Folder Operations', () => {
  describe('listFolders', () => {
    it('should list root folder contents', async () => {
      const provider = new OneDriveProvider();
      const result = await provider.listFolders('user-123', '/');

      expect(result.folders).toBeInstanceOf(Array);
      expect(result.files).toBeInstanceOf(Array);
    });

    it('should list subfolder contents', async () => {
      const provider = new OneDriveProvider();
      const result = await provider.listFolders('user-123', '/Documents');

      expect(result.folders).toBeDefined();
    });

    it('should handle pagination with nextLink', async () => {
      const provider = new OneDriveProvider();
      const result = await provider.listFolders('user-123', '/LargeFolder');

      if (result.hasMore) {
        expect(result.cursor).toBeDefined();
      }
    });

    it('should normalize folder structure', async () => {
      const provider = new OneDriveProvider();
      const result = await provider.listFolders('user-123', '/');

      const folder = result.folders[0];
      expect(folder.id).toBeDefined();
      expect(folder.name).toBeDefined();
      expect(folder.path).toBeDefined();
      expect(folder.provider).toBe('onedrive');
    });
  });

  describe('searchFolders', () => {
    it('should search for folders by name', async () => {
      const provider = new OneDriveProvider();
      const results = await provider.searchFolders('user-123', 'Documents');

      expect(results).toBeInstanceOf(Array);
    });

    it('should return empty array for no matches', async () => {
      const provider = new OneDriveProvider();
      const results = await provider.searchFolders('user-123', 'xyznonexistent');

      expect(results).toEqual([]);
    });
  });
});
```

**File:** `tests/cloud-storage/onedrive-files.test.ts`

```typescript
describe('OneDrive File Operations', () => {
  describe('getFile', () => {
    it('should return file metadata', async () => {
      const provider = new OneDriveProvider();
      const file = await provider.getFile('user-123', '/Documents/contract.pdf');

      expect(file.id).toBeDefined();
      expect(file.name).toBe('contract.pdf');
      expect(file.size).toBeGreaterThan(0);
      expect(file.mimeType).toBe('application/pdf');
    });

    it('should throw for non-existent file', async () => {
      const provider = new OneDriveProvider();

      await expect(provider.getFile('user-123', '/nonexistent.pdf'))
        .rejects.toThrow('File not found');
    });
  });

  describe('downloadFile', () => {
    it('should download file content', async () => {
      const provider = new OneDriveProvider();
      const content = await provider.downloadFile('user-123', '/Documents/test.txt');

      expect(content).toBeInstanceOf(Buffer);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should handle large files', async () => {
      const provider = new OneDriveProvider();
      const content = await provider.downloadFile('user-123', '/Documents/large.pdf');

      expect(content).toBeInstanceOf(Buffer);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return temporary download URL', async () => {
      const provider = new OneDriveProvider();
      const url = await provider.getDownloadUrl('user-123', '/Documents/file.pdf');

      expect(url).toContain('https://');
    });
  });
});
```

### 4.2 Implementation

**Microsoft Graph API Endpoints:**

```typescript
// List folder contents
GET https://graph.microsoft.com/v1.0/me/drive/root/children
GET https://graph.microsoft.com/v1.0/me/drive/items/{item-id}/children

// Search
GET https://graph.microsoft.com/v1.0/me/drive/root/search(q='{query}')

// Get file metadata
GET https://graph.microsoft.com/v1.0/me/drive/items/{item-id}

// Download file
GET https://graph.microsoft.com/v1.0/me/drive/items/{item-id}/content
```

**Files to create:**
- `lib/cloud-storage/providers/onedrive/folders.ts`
- `lib/cloud-storage/providers/onedrive/files.ts`
- `app/api/onedrive/folders/route.ts`
- `app/api/onedrive/folders/search/route.ts`
- `app/api/onedrive/files/[id]/route.ts`

### 4.3 Deliverables

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Folder Listing | Browse OneDrive folders | Returns normalized folder data |
| Folder Search | Search by query | Returns matching folders |
| File Metadata | Get file info | Returns size, type, dates |
| File Download | Download file content | Returns file as buffer |
| API Routes | Folder/file endpoints | Routes work correctly |
| Integration Tests | Full test coverage | All tests pass |

---

## Phase 5: Unified UI & Settings Integration

**Goal:** Create unified UI components and integrate into settings page.

**Duration:** ~1 day

### 5.1 Tests First (TDD)

**File:** `tests/components/cloud-storage-connection.test.tsx`

```typescript
describe('CloudStorageConnection Component', () => {
  describe('rendering', () => {
    it('should render both Dropbox and OneDrive options', () => {
      render(<CloudStorageSettings />);

      expect(screen.getByText(/Dropbox/i)).toBeInTheDocument();
      expect(screen.getByText(/OneDrive/i)).toBeInTheDocument();
    });

    it('should show connection status for each provider', () => {
      render(<CloudStorageSettings
        connections={[
          { provider: 'dropbox', isActive: true, email: 'test@dropbox.com' }
        ]}
      />);

      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      expect(screen.getByText(/test@dropbox.com/i)).toBeInTheDocument();
    });

    it('should show connect button for disconnected providers', () => {
      render(<CloudStorageSettings connections={[]} />);

      expect(screen.getAllByText(/Connect/i)).toHaveLength(2);
    });
  });

  describe('interactions', () => {
    it('should initiate OAuth when connect button clicked', async () => {
      const user = userEvent.setup();
      render(<CloudStorageSettings />);

      await user.click(screen.getByTestId('connect-dropbox'));

      expect(window.location.href).toContain('/api/auth/dropbox');
    });

    it('should disconnect when disconnect button clicked', async () => {
      const onDisconnect = vi.fn();
      const user = userEvent.setup();

      render(<CloudStorageSettings
        connections={[{ provider: 'dropbox', isActive: true }]}
        onDisconnect={onDisconnect}
      />);

      await user.click(screen.getByTestId('disconnect-dropbox'));

      expect(onDisconnect).toHaveBeenCalledWith('dropbox');
    });
  });
});
```

**File:** `tests/components/unified-folder-picker.test.tsx`

```typescript
describe('UnifiedFolderPicker Component', () => {
  it('should show provider selection when multiple connected', () => {
    render(<UnifiedFolderPicker
      connections={[
        { provider: 'dropbox', isActive: true },
        { provider: 'onedrive', isActive: true },
      ]}
    />);

    expect(screen.getByText(/Choose storage/i)).toBeInTheDocument();
  });

  it('should load folders for selected provider', async () => {
    const user = userEvent.setup();
    render(<UnifiedFolderPicker
      connections={[
        { provider: 'dropbox', isActive: true },
        { provider: 'onedrive', isActive: true },
      ]}
    />);

    await user.click(screen.getByText(/OneDrive/i));

    expect(fetchMock).toHaveBeenCalledWith('/api/onedrive/folders?path=');
  });

  it('should call onSelect with provider and path', async () => {
    const onSelect = vi.fn();
    // ... test folder selection

    expect(onSelect).toHaveBeenCalledWith({
      provider: 'onedrive',
      folderId: 'folder-123',
      folderPath: '/Documents',
    });
  });
});
```

### 5.2 Implementation

**Components:**
- `components/cloud-storage/cloud-storage-settings.tsx` - Settings panel
- `components/cloud-storage/connection-card.tsx` - Individual provider card
- `components/cloud-storage/unified-folder-picker.tsx` - Multi-provider folder picker
- `components/cloud-storage/provider-icon.tsx` - Provider icons

**Hooks:**
- `hooks/use-cloud-storage-connections.ts` - Fetch/manage connections
- `hooks/use-folder-browser.ts` - Folder browsing state

### 5.3 Deliverables

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Settings Panel | Manage all connections | Shows all providers, status |
| Connection Card | Provider-specific card | Connect/disconnect works |
| Unified Picker | Multi-provider folder picker | Works with both providers |
| Provider Icons | Visual identification | Correct icons displayed |
| Hooks | State management | Clean, reusable hooks |
| Component Tests | Full test coverage | All tests pass |

---

## Test Coverage Requirements

Each phase must meet these criteria before moving to the next:

| Metric | Minimum | Target |
|--------|---------|--------|
| Statement Coverage | 80% | 90% |
| Branch Coverage | 75% | 85% |
| Function Coverage | 85% | 95% |
| Integration Tests | Pass | Pass |

---

## Environment Variables

Add to `.env.local`:

```env
# Existing Dropbox
DROPBOX_APP_KEY=your-dropbox-key
DROPBOX_APP_SECRET=your-dropbox-secret
DROPBOX_REDIRECT_URI=http://localhost:3000/api/auth/dropbox/callback

# New OneDrive
ONEDRIVE_CLIENT_ID=your-azure-client-id
ONEDRIVE_CLIENT_SECRET=your-azure-client-secret
ONEDRIVE_TENANT_ID=common  # or specific tenant
ONEDRIVE_REDIRECT_URI=http://localhost:3000/api/auth/onedrive/callback
```

---

## Database Migrations

### Phase 3 Migration

```sql
-- Create OneDrive connections table
CREATE TABLE onedrive_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  microsoft_account_id TEXT NOT NULL,
  microsoft_email TEXT,
  microsoft_display_name TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX onedrive_connections_user_id_idx ON onedrive_connections(user_id);
CREATE INDEX onedrive_connections_is_active_idx ON onedrive_connections(is_active);

-- RLS Policies (same pattern as Dropbox)
ALTER TABLE onedrive_connections ENABLE ROW LEVEL SECURITY;
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Azure AD setup delays | Medium | High | Provide detailed setup docs |
| Microsoft Graph rate limits | Low | Medium | Implement exponential backoff |
| Token refresh failures | Low | High | Auto-reconnect prompt |
| Large file handling | Medium | Medium | Streaming download support |
| Different folder structures | Low | Low | Normalize in provider layer |

---

## Success Metrics

| Phase | Success Criteria |
|-------|-----------------|
| Phase 1 | Provider interface compiles, factory works |
| Phase 2 | All existing Dropbox tests pass, new tests pass |
| Phase 3 | User can connect OneDrive, tokens stored |
| Phase 4 | Can browse and download OneDrive files |
| Phase 5 | UI shows both providers, unified picker works |

---

## Rollback Plan

Each phase is independently deployable:

1. **Phase 1-2:** No user-facing changes, safe to deploy
2. **Phase 3:** OneDrive routes behind feature flag initially
3. **Phase 4:** API routes can be disabled via env var
4. **Phase 5:** UI components conditionally rendered

```typescript
// Feature flag pattern
const ENABLE_ONEDRIVE = process.env.ENABLE_ONEDRIVE === 'true';

// In component
{ENABLE_ONEDRIVE && <OneDriveConnectionCard />}
```

---

## Post-Implementation

After all phases complete:

1. **Documentation:** Update user docs with OneDrive setup
2. **Monitoring:** Add error tracking for OneDrive API calls
3. **Analytics:** Track connection rates per provider
4. **Future:** Prepare for Google Drive integration using same pattern

---

## Appendix: Microsoft Graph API Reference

### Authentication Endpoints

```
Authorization: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
Token: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
```

### File API Endpoints

```
List root: GET /me/drive/root/children
List folder: GET /me/drive/items/{id}/children
Search: GET /me/drive/root/search(q='{query}')
Metadata: GET /me/drive/items/{id}
Download: GET /me/drive/items/{id}/content
```

### Required Scopes

```
Files.Read
Files.Read.All (for shared files)
User.Read
offline_access (for refresh tokens)
```
