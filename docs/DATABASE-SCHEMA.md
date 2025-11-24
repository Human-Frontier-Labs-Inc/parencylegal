# Parency Lawyer Database Schema

## Overview
Complete database schema for the Parency Lawyer MVP using **Drizzle ORM** with **PostgreSQL** (Supabase).

**Tech Stack:**
- Database: PostgreSQL (Supabase)
- ORM: Drizzle
- Auth: Clerk
- Payments: Stripe
- Storage: Supabase Storage (for PDFs)

---

## 📊 Schema Diagram

```
┌─────────────────┐
│    profiles     │──┐
│                 │  │
│ - userId (PK)   │  │
│ - email         │  │
│ - membership    │  │
│ - stripe info   │  │
│ - usage limits  │  │
└─────────────────┘  │
                      │
         ┌────────────┴────────────┐
         │                          │
         ▼                          │
┌─────────────────┐                │
│dropbox_connect..│                │
│                 │                │
│ - id (PK)       │                │
│ - userId (FK)   │◄───────────────┘
│ - accessToken   │
│ - refreshToken  │
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│      cases      │◄─────────────┐
│                 │              │
│ - id (PK)       │              │
│ - userId (FK)   │──────────────┤
│ - name          │              │
│ - dropbox path  │              │
│ - status        │              │
└─────────────────┘              │
         │                        │
         ├────────────┬───────────┤
         │            │           │
         ▼            ▼           │
┌─────────────┐ ┌──────────┐     │
│  documents  │ │discovery_│     │
│             │ │requests  │     │
│ - id (PK)   │ │          │     │
│ - caseId FK │ │- id (PK) │     │
│ - category  │ │- caseId  │     │
│ - confidence│ │- type    │     │
│ - metadata  │ │- number  │     │
└─────────────┘ └──────────┘     │
      │              │            │
      └──────┬───────┘            │
             ▼                    │
   ┌──────────────────┐           │
   │document_request_ │           │
   │    mappings      │           │
   │                  │           │
   │ - documentId FK  │           │
   │ - requestId FK   │           │
   │ - confidence     │           │
   │ - status         │           │
   └──────────────────┘           │
                                   │
         ┌─────────────────────────┤
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌───────────────┐
│ ai_chat_sessions│       │ sync_history  │
│                 │       │               │
│ - id (PK)       │       │ - id (PK)     │
│ - caseId (FK)   │       │ - caseId (FK) │
│ - messages      │       │ - filesFound  │
│ - tokenUsage    │       │ - filesNew    │
│ - totalCost     │       │ - duration    │
└─────────────────┘       └───────────────┘
```

---

## 📋 Tables

### 1. `profiles`
**Purpose:** User/attorney account information and subscription details

| Column | Type | Notes |
|--------|------|-------|
| userId | text (PK) | Clerk user ID |
| email | text | User email |
| fullName | text | Attorney name |
| firmName | text | Law firm name (Small Firm/Enterprise) |
| membership | enum | trial, solo, small_firm, enterprise |
| stripeCustomerId | text | Stripe customer ID |
| stripeSubscriptionId | text | Stripe subscription ID |
| stripePriceId | text | Stripe price ID (plan) |
| planDuration | text | monthly | yearly |
| billingCycleStart | timestamp | Billing period start |
| billingCycleEnd | timestamp | Billing period end |
| documentsProcessedThisMonth | integer | Usage tracking |
| documentLimit | integer | Plan limit (500/2500/unlimited) |
| seatsUsed | integer | Team members |
| seatsLimit | integer | Plan limit (1/5/unlimited) |
| trialEndsAt | timestamp | 14-day trial end |
| status | text | active, past_due, canceled |

**RLS:** Users can only view their own profile. Service role has full access.

---

### 2. `dropbox_connections`
**Purpose:** Store Dropbox OAuth tokens per user

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| userId | text (FK, unique) | One connection per user |
| accessToken | text | Encrypted in production |
| refreshToken | text | For token refresh |
| tokenExpiresAt | timestamp | Token expiry |
| dropboxAccountId | text | Dropbox account ID |
| dropboxEmail | text | Dropbox email |
| isActive | boolean | Connection status |

**RLS:** Users can only view/manage their own connection.

---

### 3. `cases`
**Purpose:** Legal cases managed by attorneys

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| userId | text (FK) | Attorney who owns case |
| name | text | e.g., "Smith v. Smith" |
| clientName | text | Client name |
| opposingParty | text | Opposing party name |
| caseNumber | text | Court case number |
| status | text | active, discovery, trial_prep, closed |
| dropboxFolderPath | text | e.g., "/Clients/Smith" |
| dropboxFolderId | text | Dropbox folder ID |
| lastSyncedAt | timestamp | Last Dropbox sync |
| notes | text | Attorney notes |

**RLS:** Users can only view/edit their own cases.

**Indexes:**
- `cases_user_id_idx` on userId
- `cases_status_idx` on status

---

### 4. `documents`
**Purpose:** All documents imported from Dropbox or uploaded manually

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| caseId | text (FK) | References cases.id |
| userId | text | Denormalized for performance |
| source | text | dropbox, manual_upload |
| dropboxFileId | text | Unique Dropbox file ID |
| dropboxFilePath | text | Full Dropbox path |
| dropboxRev | text | Version tracking |
| fileName | text | Original filename |
| fileType | text | pdf, docx, jpg, etc. |
| fileSize | integer | Bytes |
| storagePath | text | Supabase Storage path |
| storageUrl | text | Public/signed URL |
| documentDate | timestamp | Statement date, incident date |
| category | text | Financial, Medical, Legal, etc. |
| subtype | text | Bank Statement, Court Order, etc. |
| confidence | integer | 0-100 (AI confidence) |
| needsReview | boolean | True if confidence < 80% |
| reviewedAt | timestamp | Manual review timestamp |
| reviewedBy | text | User ID who reviewed |
| metadata | jsonb | Extracted dates, amounts, parties |
| classificationHistory | jsonb | Audit trail of classifications |

**RLS:** Users can only view documents in their cases.

**Indexes:**
- `documents_case_id_idx` on caseId
- `documents_category_idx` on category
- `documents_needs_review_idx` on needsReview
- `documents_dropbox_file_id_idx` on dropboxFileId

---

### 5. `discovery_requests`
**Purpose:** RFPs and Interrogatories per case

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| caseId | text (FK) | References cases.id |
| userId | text | Denormalized |
| type | text | "RFP" or "Interrogatory" |
| number | integer | Request number (e.g., 12) |
| text | text | Full request text |
| categoryHint | text | Financial, Medical (optional) |
| status | text | incomplete, complete, partial |
| completionPercentage | integer | 0-100 |
| notes | text | Attorney notes |

**RLS:** Users can only view/edit requests in their cases.

**Indexes:**
- `discovery_requests_case_id_idx` on caseId
- `discovery_requests_status_idx` on status
- Unique constraint on (caseId, type, number)

---

### 6. `document_request_mappings`
**Purpose:** Map documents to discovery requests

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| documentId | text (FK) | References documents.id |
| requestId | text (FK) | References discovery_requests.id |
| caseId | text | Denormalized |
| userId | text | Denormalized |
| source | text | ai_suggestion, manual_addition |
| confidence | integer | 0-100 (AI confidence) |
| reasoning | text | AI's reasoning |
| status | text | suggested, accepted, rejected |
| reviewedAt | timestamp | Review timestamp |
| reviewedBy | text | User ID |

**RLS:** Users can only view/edit mappings in their cases.

**Indexes:**
- `document_mappings_document_id_idx` on documentId
- `document_mappings_request_id_idx` on requestId
- `document_mappings_status_idx` on status
- Unique constraint on (documentId, requestId)

---

### 7. `ai_chat_sessions`
**Purpose:** Track OpenAI chat sessions for persistent conversations

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| caseId | text (FK) | References cases.id (optional) |
| userId | text | User who started session |
| type | text | classification, discovery_mapping, gap_detection |
| messages | jsonb | Array of {role, content, timestamp} |
| totalInputTokens | integer | Token usage tracking |
| totalOutputTokens | integer | Token usage tracking |
| cachedInputTokens | integer | Cached tokens (90% discount) |
| totalCost | integer | Cost in cents |
| metadata | jsonb | Session metadata |
| status | text | active, completed, error |
| completedAt | timestamp | Session end time |

**RLS:** Users can only view their own AI sessions.

**Indexes:**
- `ai_sessions_case_id_idx` on caseId
- `ai_sessions_type_idx` on type
- `ai_sessions_status_idx` on status

---

### 8. `sync_history`
**Purpose:** Track Dropbox sync operations

| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | UUID |
| caseId | text (FK) | References cases.id |
| userId | text | User who initiated sync |
| source | text | dropbox, manual_upload |
| status | text | in_progress, completed, error |
| filesFound | integer | Total files in Dropbox |
| filesNew | integer | New files imported |
| filesUpdated | integer | Updated files |
| filesSkipped | integer | Duplicates |
| filesError | integer | Failed imports |
| errors | jsonb | Array of error details |
| startedAt | timestamp | Sync start time |
| completedAt | timestamp | Sync end time |
| durationMs | integer | Duration in milliseconds |
| metadata | jsonb | Additional sync metadata |

**RLS:** Users can only view sync history for their cases.

**Indexes:**
- `sync_history_case_id_idx` on caseId
- `sync_history_status_idx` on status
- `sync_history_started_at_idx` on startedAt

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### Read Policy
```sql
CREATE POLICY "Users can only view their own [table]"
ON [table]
FOR SELECT
USING (auth.uid()::text = user_id);
```

### Write Policies (Service Role Only)
All INSERT/UPDATE/DELETE operations require `service_role` to prevent direct client writes:

```sql
CREATE POLICY "Service role can [operation] [table]"
ON [table]
FOR [INSERT|UPDATE|DELETE]
WITH CHECK (auth.role() = 'service_role');
```

**Why service role only?**
- Prevents malicious clients from bypassing business logic
- Ensures data integrity through API routes
- Allows complex validation before writes
- Audit trail control

---

## 🔑 Relationships

### One-to-Many
- `profiles` → `cases` (one attorney, many cases)
- `profiles` → `dropbox_connections` (one connection per user)
- `cases` → `documents` (one case, many documents)
- `cases` → `discovery_requests` (one case, many requests)
- `cases` → `sync_history` (one case, many syncs)
- `cases` → `ai_chat_sessions` (one case, many sessions)

### Many-to-Many
- `documents` ↔ `discovery_requests` (via `document_request_mappings`)

### Cascade Deletes
When a **case is deleted**:
- ✅ All documents deleted
- ✅ All discovery requests deleted
- ✅ All document-request mappings deleted
- ✅ All sync history deleted
- ✅ All AI chat sessions deleted

**Protects:** User data integrity, prevents orphaned records

---

## 📊 Indexes for Performance

### Critical Indexes (Query Optimization)

**Cases:**
- `user_id` - Filter cases by attorney
- `status` - Filter active/closed cases

**Documents:**
- `case_id` - Get all documents for a case
- `category` - Filter by Financial/Medical/etc.
- `needs_review` - Find docs needing manual review
- `dropbox_file_id` - Prevent duplicate imports

**Discovery Requests:**
- `case_id` - Get all requests for a case
- `status` - Filter incomplete/complete requests
- `(case_id, type, number)` - Unique constraint

**Mappings:**
- `document_id` - Get all requests for a document
- `request_id` - Get all documents for a request
- `status` - Filter suggested/accepted/rejected
- `(document_id, request_id)` - Unique constraint

**AI Sessions:**
- `case_id` - Get all sessions for a case
- `type` - Filter by session type
- `status` - Filter active/completed sessions

**Sync History:**
- `case_id` - Get sync history for a case
- `started_at` - Sort by most recent syncs
- `status` - Filter in-progress/completed/error

---

## 💾 Storage Estimates

### Per Case (Average)

**Documents:** 50 files × 2MB = **100MB**

**Database rows:**
- 1 case
- 50 documents
- 10 discovery requests
- 100 document-request mappings (avg 2 docs per request)
- 5 sync operations
- 3 AI chat sessions

**Total per case:** ~165 rows

### Per Attorney (20 cases)

**Database rows:** 20 × 165 = **3,300 rows**

**Storage:** 20 × 100MB = **2GB** (Supabase Storage)

### At Scale (1,000 attorneys)

**Database rows:** 1,000 × 3,300 = **3.3M rows**

**Storage:** 1,000 × 2GB = **2TB** (manageable with Supabase)

---

## 🚀 Next Steps

1. ✅ **Schema designed** (all 8 tables)
2. ⏳ **Create Drizzle migration** (next step)
3. ⏳ **Push to Supabase** (drizzle-kit push)
4. ⏳ **Seed test data**
5. ⏳ **Write schema tests**

---

**Status:** Schema complete, ready for migration ✅
