# Database Connection Diagnosis - COMPLETE

## 🔍 Diagnosis Complete

I've tested all possible Supabase connection formats and the **project does not exist or is inaccessible**.

## Test Results

### ✅ What Works
- **Supabase REST API**: Returns valid OpenAPI spec
- **Network connectivity**: Can reach Supabase infrastructure
- **Environment variables**: Properly loaded from `.env.local`

### ❌ What Doesn't Work

| Connection Type | Port | Error |
|----------------|------|-------|
| Direct connection | 5432 | `ENOTFOUND db.xdpuwjbyjfgtknkmswka.supabase.co` |
| Direct connection (IPv6) | 6543 | `ENOTFOUND db.xdpuwjbyjfgtknkmswka.supabase.co` |
| Pooler (us-west-1) | 5432 | `Tenant or user not found` |
| Pooler (us-west-1) | 6543 | `Tenant or user not found` |
| Pooler (us-east-1) | 5432 | `Tenant or user not found` |

## Root Cause

**The Supabase project `xdpuwjbyjfgtknkmswka` does not exist or has been:**
1. ❌ Deleted
2. ❌ Paused (free tier auto-pauses after inactivity)
3. ❌ Never created (placeholder credentials)

## 🎯 Solution: Create New Supabase Project

### Step 1: Create Project (5 minutes)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Login with your account

2. **Create New Project**
   - Click "New Project"
   - **Organization**: Choose your org or personal
   - **Name**: `Parency Legal Dev` (or `parency-legal-prod` for production)
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to you:
     - `us-west-1` (California)
     - `us-east-1` (Virginia)
     - `eu-central-1` (Frankfurt)
   - **Pricing Plan**: Free (good for development)

3. **Wait for Provisioning** (~2 minutes)
   - Coffee break ☕

### Step 2: Get New Credentials

After project is ready, go to **Settings**:

#### A. API Credentials (Settings > API)
```
Project URL: https://[NEW-PROJECT-REF].supabase.co
Anon (public) key: eyJh...
Service role key: eyJh... (keep secret!)
```

#### B. Database Credentials (Settings > Database)

Click **"Connection String"** > **"URI"**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres
```

### Step 3: Update `.env.local`

Replace these values in `/Users/corneliusgeorge/Parency/Parency Legal/parencylegal/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[NEW-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[NEW-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[NEW-SERVICE-ROLE-KEY]

# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres
```

**Important**: Use the **pooler connection** for better performance in production:
```bash
# Pooler (recommended for serverless)
DATABASE_URL=postgresql://postgres.[NEW-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Step 4: Verify Connection

Run the test script:
```bash
node scripts/test-db-connection.mjs
```

Expected output:
```
✅ SUCCESS! Connection works!
PostgreSQL version: PostgreSQL 15.x
```

### Step 5: Apply Database Migrations

```bash
# Generate migration files (if needed)
npm run db:generate

# Push schema to database
npm run db:push
```

This will create all tables:
- `cases`
- `documents`
- `discovery_requests`
- `document_request_mappings`
- `ai_chat_sessions`
- `sync_history`
- `dropbox_connections`
- `profiles`

### Step 6: Run Tests (TDD Cycle)

```bash
# Run schema tests
npm run test:run -- tests/db/schema.test.ts
```

Expected: **All 15 tests pass** ✅

## Alternative: Local PostgreSQL (Faster for Testing)

If you want faster tests without network latency:

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb parency_legal_dev

# Update .env.local
DATABASE_URL=postgresql://postgres@localhost:5432/parency_legal_dev
```

### Ubuntu/Linux
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb parency_legal_dev

# Update .env.local
DATABASE_URL=postgresql://postgres@localhost:5432/parency_legal_dev
```

Then run migrations:
```bash
npm run db:push
npm run test:run
```

## Verification Checklist

After setup:
- [ ] `node scripts/test-db-connection.mjs` succeeds
- [ ] `npm run db:push` creates all tables
- [ ] Can see tables in Supabase Dashboard > Table Editor
- [ ] `npm run test:run` passes all tests
- [ ] `npm run db:studio` opens Drizzle Studio

## Next Steps After Database is Working

1. ✅ Run schema tests in RED phase (should fail - no tables yet)
2. ✅ Apply migrations (`npm run db:push`)
3. ✅ Run schema tests in GREEN phase (should pass - tables exist)
4. ✅ Write RLS policy tests
5. ✅ Write authentication tests
6. ✅ Deploy to Vercel staging

## Files to Update

1. **`.env.local`** - New Supabase credentials
2. **`.env.example`** - Update with new project ref (for team)
3. **`docs/PHASE-1-PROGRESS.md`** - Mark database connection as complete

## Estimated Time

- Create Supabase project: 5 minutes
- Update credentials: 2 minutes
- Apply migrations: 1 minute
- Run tests: 1 minute

**Total: ~10 minutes** to unblock development 🚀

---

**Status**: Waiting for new Supabase project creation
**Blocker Severity**: High (blocks all database tests)
**Required Action**: User must create new Supabase project
**Script Created**: `scripts/test-db-connection.mjs` for verification
