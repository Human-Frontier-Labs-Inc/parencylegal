# Quick Start After Supabase Setup

## ✅ You've Created a New Supabase Project - What's Next?

### 1️⃣ Update Environment Variables (2 minutes)

Open `.env.local` and replace these values from your new Supabase project:

```bash
# From Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-NEW-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-NEW-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-NEW-SERVICE-ROLE-KEY]

# From Supabase Dashboard > Settings > Database > Connection String
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-NEW-PROJECT-REF].supabase.co:5432/postgres
```

**Pro Tip**: For Vercel/serverless deployments, use the pooler:
```bash
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 2️⃣ Run Automated Setup (1 minute)

We've created a helper script that does everything:

```bash
./scripts/setup-database.sh
```

This script will:
- ✅ Test database connection
- ✅ Generate migrations
- ✅ Apply schema to database
- ✅ Verify all tables created
- ✅ Run tests

**OR** do it manually:

```bash
# Test connection
node scripts/test-db-connection.mjs

# Apply schema
npm run db:push

# Run tests
npm run test:run -- tests/db/schema.test.ts
```

### 3️⃣ Verify Everything Works

#### A. Check Supabase Dashboard
1. Go to **Table Editor** in Supabase Dashboard
2. You should see 8 tables:
   - ✅ cases
   - ✅ documents
   - ✅ discovery_requests
   - ✅ document_request_mappings
   - ✅ ai_chat_sessions
   - ✅ sync_history
   - ✅ dropbox_connections
   - ✅ profiles

#### B. Run Database Studio
```bash
npm run db:studio
```
Opens Drizzle Studio at http://localhost:4983

#### C. Run All Tests
```bash
npm run test:run
```

Expected: **15 tests pass** ✅

### 4️⃣ Start Development

```bash
npm run dev
```

Visit: http://localhost:3000

## 📋 TDD Progress After Setup

Once database is working, you'll complete:

### ✅ Completed
- Test infrastructure setup
- Schema validation tests written (15 tests)
- Database schema defined

### 🚧 Next (in order)
1. **Run tests in RED phase** - Tests fail (no data yet)
2. **Create seed data** - Add test cases/documents
3. **Run tests in GREEN phase** - All tests pass
4. **Write RLS policy tests** - User isolation
5. **Write auth tests** - Clerk integration
6. **Deploy to Vercel staging**

### Phase 1 Completion: ~40%
After database setup, you'll be at 40% completion of Phase 1!

## 🐛 Troubleshooting

### "Cannot connect to database"
**Fix**: Verify DATABASE_URL in .env.local
```bash
node scripts/test-db-connection.mjs
```

### "Table already exists"
**Fix**: Drop tables and re-run
```sql
-- In Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
Then run: `npm run db:push`

### "Tests fail with permission errors"
**Fix**: RLS policies block connections. Tests use service role:
- Check SUPABASE_SERVICE_ROLE_KEY is set
- Service role bypasses RLS

### "Migration conflicts"
**Fix**: Reset migrations
```bash
rm -rf db/migrations/*
npm run db:generate
npm run db:push
```

## 📚 Helpful Commands

| Command | Description |
|---------|-------------|
| `npm run db:studio` | Open database GUI |
| `npm run db:generate` | Generate migration files |
| `npm run db:push` | Apply schema to database |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate coverage report |
| `./scripts/setup-database.sh` | Automated setup |
| `node scripts/test-db-connection.mjs` | Test connection |

## 🎯 Success Criteria

You'll know setup is complete when:
- ✅ `node scripts/test-db-connection.mjs` succeeds
- ✅ All 8 tables visible in Supabase Dashboard
- ✅ `npm run test:run` shows 15 passing tests
- ✅ `npm run db:studio` opens successfully
- ✅ `npm run dev` starts without database errors

## 🚀 After Setup - Continue Development

### Next Files to Work On

1. **Authentication Tests** (`tests/auth/auth.test.ts`)
   - Clerk user registration
   - Login/logout flows
   - Protected routes

2. **RLS Policy Tests** (`tests/db/rls-policies.test.ts`)
   - User data isolation
   - Cross-user access prevention

3. **API Route Tests** (`tests/api/cases.test.ts`)
   - CRUD operations
   - Validation
   - Error handling

### Development Workflow (TDD)

```bash
# 1. Write failing test
code tests/api/cases.test.ts

# 2. Run test (should fail - RED)
npm run test -- tests/api/cases.test.ts

# 3. Implement feature
code app/api/cases/route.ts

# 4. Run test (should pass - GREEN)
npm run test -- tests/api/cases.test.ts

# 5. Refactor
# Improve code while tests still pass

# 6. Commit
git add .
git commit -m "feat: add case CRUD API with tests"
```

## 📞 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Drizzle Docs**: https://orm.drizzle.team
- **Test Docs**: https://vitest.dev
- **TDD Plan**: See `/docs/TDD-IMPLEMENTATION-PLAN.md`
- **Progress**: See `/docs/PHASE-1-PROGRESS.md`

---

**Estimated Total Time**: 5 minutes
**Current Phase**: Phase 1.1 - Database Foundation
**Next Milestone**: All database tests passing ✅
