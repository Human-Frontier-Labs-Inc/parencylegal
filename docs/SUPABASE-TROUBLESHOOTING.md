# Supabase Connection Troubleshooting

## Issue Summary
Cannot connect to Supabase database for testing.

## Diagnostic Results

### 1. Environment Variables
✅ **Found in `.env.local`:**
- `NEXT_PUBLIC_SUPABASE_URL`: https://xdpuwjbyjfgtknkmswka.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Present
- `SUPABASE_SERVICE_ROLE_KEY`: Present
- `DATABASE_URL`: postgresql://postgres:****@db.xdpuwjbyjfgtknkmswka.supabase.co:5432/postgres

### 2. Network Connectivity Tests

#### DNS Resolution
```bash
$ nslookup db.xdpuwjbyjfgtknkmswka.supabase.co
Server:		192.168.1.1
Address:	192.168.1.1#53

*** Can't find db.xdpuwjbyjfgtknkmswka.supabase.co: No answer
```
❌ **Result**: Database hostname does NOT resolve

#### API Endpoint Test
```bash
$ curl -I https://xdpuwjbyjfgtknkmswka.supabase.co
HTTP/2 404
```
❌ **Result**: Supabase project returns 404 (not found)

### 3. Root Cause Analysis

The Supabase project `xdpuwjbyjfgtknkmswka` appears to be:
1. **Deleted** - Project was removed from Supabase
2. **Paused** - Free tier projects pause after inactivity
3. **Never Created** - These are placeholder credentials
4. **Wrong Region** - Project exists in different region

## Recommended Solutions

### Option 1: Create New Supabase Project (Recommended)
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose:
   - **Name**: Parency Legal Dev
   - **Database Password**: (Generate strong password)
   - **Region**: Closest to you (e.g., US West)
   - **Pricing Plan**: Free (for development)

4. Wait for project to provision (~2 minutes)

5. Update `.env.local` with new credentials:
   ```bash
   # From Settings > API
   NEXT_PUBLIC_SUPABASE_URL=https://[NEW-PROJECT-REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[NEW-ANON-KEY]
   SUPABASE_SERVICE_ROLE_KEY=[NEW-SERVICE-ROLE-KEY]

   # From Settings > Database > Connection String > URI
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres
   ```

### Option 2: Use Local PostgreSQL (Fastest for Testing)
1. Install PostgreSQL locally:
   ```bash
   # macOS
   brew install postgresql@16
   brew services start postgresql@16

   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. Create test database:
   ```bash
   psql -U postgres
   CREATE DATABASE parency_legal_test;
   CREATE USER parency_test WITH PASSWORD 'test_password';
   GRANT ALL PRIVILEGES ON DATABASE parency_legal_test TO parency_test;
   ```

3. Update `.env.local`:
   ```bash
   DATABASE_URL=postgresql://parency_test:test_password@localhost:5432/parency_legal_test
   ```

### Option 3: Use Supabase Local Development
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

3. This gives you local PostgreSQL + all Supabase features

## Next Steps After Fixing Connection

1. **Apply Database Migrations**
   ```bash
   npm run db:push
   ```

2. **Run Schema Tests**
   ```bash
   npm run test:run -- tests/db/schema.test.ts
   ```

3. **Verify Tables Created**
   - Check Supabase Dashboard > Table Editor
   - Or run: `npm run db:studio`

## Test Database Best Practices

### For Development
- ✅ Use local PostgreSQL for fast iteration
- ✅ No network latency
- ✅ No API rate limits
- ✅ Can reset/wipe easily

### For CI/CD
- ✅ Use separate Supabase project for testing
- ✅ Never use production database
- ✅ Automated cleanup after tests

### Current Recommendation
**Use Option 1 (New Supabase Project)** because:
1. Matches production environment closely
2. Can test Supabase-specific features (RLS, triggers, etc.)
3. Easy to share with team
4. Free tier is sufficient for development

Then later, set up Option 2 (Local PostgreSQL) for faster test iteration.

## Common Errors & Solutions

### Error: "role 'test' does not exist"
**Cause**: Using mock DATABASE_URL from test setup
**Fix**: Load actual DATABASE_URL from .env.local (already fixed in setup.ts)

### Error: "getaddrinfo ENOTFOUND"
**Cause**: Database hostname doesn't resolve
**Fix**: Create new Supabase project or use local PostgreSQL

### Error: "password authentication failed"
**Cause**: Wrong database password
**Fix**: Reset database password in Supabase Dashboard > Settings > Database

### Error: "Connection timeout"
**Cause**: Supabase project paused (free tier)
**Fix**: Wake up project by visiting dashboard, or upgrade to paid plan

## Verification Checklist

After setting up new database:
- [ ] Can connect to database via psql/pgAdmin
- [ ] Environment variables updated in `.env.local`
- [ ] Can run `npm run db:push` successfully
- [ ] Can see tables in Supabase Dashboard
- [ ] Tests can connect and run
- [ ] No DNS resolution errors

---

**Status**: Awaiting new Supabase project creation
**Blocker**: Cannot proceed with tests until database is accessible
**ETA**: ~5 minutes after creating new project
