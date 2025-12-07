# Willy to Corn Handoff - Parencylegal Migration Complete

**Date:** 2025-12-07 | **Engineer:** Willy

---

## Summary

Parencylegal-temp has been fully migrated from Supabase to Neon + Vercel Blob and deployed to production on Vercel. The Parent-Lawyer Sync feature connecting to CoParencyParent staging is working.

---

## What Changed

### Database: Supabase -> Neon PostgreSQL

| Before | After |
|--------|-------|
| Supabase PostgreSQL | Neon PostgreSQL |
| `DATABASE_URL` pointed to Supabase | Now points to `bitter-wind-14253291` Neon project |
| RLS policies | Removed (Clerk handles auth) |

**Neon Project:** `bitter-wind-14253291`
**Connection:** Already set in Vercel env vars

### File Storage: Supabase Storage -> Vercel Blob

| Component | Change |
|-----------|--------|
| `lib/ai/classification.ts` | Now uses Vercel Blob for document downloads |
| `lib/export/export-service.ts` | Now uses Vercel Blob for signed URLs |
| `lib/dropbox/sync.ts` | Now uses Vercel Blob for uploads |
| `lib/onedrive/sync.ts` | Now uses Vercel Blob for uploads |
| `app/api/documents/[id]/preview-url/route.ts` | Now uses Vercel Blob for preview URLs |

**Vercel Blob Token:** `BLOB_READ_WRITE_TOKEN` set in Vercel env vars

---

## Parent-Lawyer Sync Feature (COMPLETED)

### How It Works

```
Parencyparent (staging)          Parencylegal (Vercel prod)
coparency.humanfrontiertests.com    parencylegal.vercel.app
         |                                    |
         | <-- API call with token ---------- |
         | -- Returns parent data ----------> |
```

### Files Added/Modified

**Schema (`db/schema/cases-schema.ts`):**
```typescript
parentSyncToken: text('parent_sync_token'),
parentSyncConnectedAt: timestamp('parent_sync_connected_at'),
parentName: text('parent_name'),
parentEmail: text('parent_email'),
```

**API Route (`app/api/cases/[id]/route.ts`):**
- PATCH now accepts `parentSyncToken`, `parentSyncConnectedAt`, `parentName`, `parentEmail`

**Sync Client (`lib/parency-sync.ts`):**
- `validateAndFetchParentData(token)` - Validates token and fetches parent data
- `ParencySyncError` - Custom error class with `statusCode` and `errorType`
- Handles 401 (revoked), 502 (staging down), network errors

**UI Components:**
- `components/cases/parent-sync-tab.tsx` - Main sync tab with data display
- `components/cases/parent-sync-settings.tsx` - Token input and connection management
- `components/cases/parent-sync-data-table.tsx` - Table display for incidents/expenses/etc

**Case Detail Page (`app/dashboard/cases/[id]/page.tsx`):**
- Added "Parent Sync" tab to case tabs
- Fetches sync data when tab is active

---

## Potential Issues to Watch

### 1. Dropbox/OneDrive Sync

The cloud storage sync code was updated to use Vercel Blob, but **it's unclear if this integration is fully tested**. The sync logic in:
- `lib/dropbox/sync.ts`
- `lib/onedrive/sync.ts`

These now upload to Vercel Blob instead of Supabase Storage. If users report sync issues, check:
1. `BLOB_READ_WRITE_TOKEN` is valid
2. File paths/URLs are being generated correctly
3. The blob upload/download functions match expected behavior

### 2. AI Context from Database

All AI features should work since they query the same schema, just from Neon instead of Supabase. The `DATABASE_URL` change is transparent to Drizzle ORM.

**Test by:**
1. Opening a case with documents
2. Using the AI chat feature
3. Verifying it can read document content and case context

### 3. Parent Sync Staging Dependency

The Parent-Lawyer Sync feature calls `coparency.humanfrontiertests.com` which runs on ubuntu-homelab port 3000. If it's down, you get 502 errors.

**To restart staging:**
```bash
ssh willy@ubuntu-homelab "cd ~/hfl-projects/Parencyparent && PORT=3000 npm run dev"
```

Or ask Willy to run: `remote-dev start ~/hfl-projects/Parencyparent 3000`

---

## Seed Data

Three test users have case data in the database:

| User ID | Notes |
|---------|-------|
| `user_36WxgLcpmPh4H1QQMM5AtyTfo4o` | Test user 1 |
| `user_36X3nqDnNV7tjLxPoIwm52ognok` | Test user 2 |
| `user_36X66zNG8TkDq15iFb0QyYAYK6B` | Test user 3 |

---

## Environment Variables (Vercel)

| Variable | Status |
|----------|--------|
| `DATABASE_URL` | Updated to Neon |
| `BLOB_READ_WRITE_TOKEN` | Added (Vercel Blob) |
| `CLERK_*` | Unchanged |
| `OPENAI_API_KEY` | Unchanged |
| `STRIPE_*` | Unchanged |

---

## Git History

The `.env.local.backup` file that contained secrets was purged from git history using `git filter-branch`. The main branch was force-pushed after the cleanup.

---

## Deployment

**Production URL:** https://parencylegal.vercel.app
**Vercel Project:** `human-frontier-labs-inc/parencylegal`
**Branch:** `main` (auto-deploys on push)

---

## Quick Checklist for Corn

- [ ] Test login with a seed user
- [ ] Test AI chat on a case
- [ ] Test document upload/download
- [ ] Test Dropbox/OneDrive sync if used
- [ ] Test Parent Sync tab (requires token from Parencyparent staging)
- [ ] Verify no 500 errors in Vercel logs

---

*Handoff complete. Ping Willy on Slack if staging goes down.*
