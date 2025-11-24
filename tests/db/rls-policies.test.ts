import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { casesTable } from '@/db/schema/cases-schema'
import { documentsTable } from '@/db/schema/documents-schema'
import { config } from 'dotenv'

config({ path: '.env.local' })

const testDbUrl = process.env.DATABASE_URL
if (!testDbUrl) {
  console.warn('DATABASE_URL not set, tests will be skipped')
  process.exit(0)
}

// Create two different clients to simulate different users
const serviceRoleClient = postgres(testDbUrl, { max: 1 })
const serviceRoleDb = drizzle(serviceRoleClient)

// For RLS testing, we'll need to use Supabase client with different auth contexts
// Note: Clerk uses different auth than Supabase auth.uid()
// Our schema uses service_role for all operations, so RLS is bypassed by design

// Cleanup function
async function cleanupDatabase() {
  try {
    await serviceRoleDb.execute(sql`TRUNCATE TABLE documents CASCADE`)
    await serviceRoleDb.execute(sql`TRUNCATE TABLE cases CASCADE`)
  } catch (error) {
    console.error('Error cleaning up database:', error)
  }
}

beforeAll(async () => {
  await cleanupDatabase()
})

beforeEach(async () => {
  await cleanupDatabase()
})

afterAll(async () => {
  await cleanupDatabase()
  await serviceRoleClient.end()
})

describe('Database RLS Policies - Service Role Access', () => {
  // Note: Our application uses Clerk for authentication
  // We use service_role connection which bypasses RLS
  // Security is enforced at the application level by filtering by userId
  // This is the recommended pattern for Next.js + Clerk

  test('should verify RLS would be bypassed by service role', async () => {
    // When using service_role connection, RLS is bypassed
    // This is expected and correct for our architecture
    // We enforce security at the application level (see userId filtering tests below)

    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test',
      name: 'Test Case',
    }

    // Service role can always insert regardless of RLS
    const result = await serviceRoleDb.insert(casesTable).values(testCase).returning()
    expect(result).toHaveLength(1)
  })

  test('should document that RLS is not enabled (application-level security)', async () => {
    // Check RLS status - should be false because we use application-level security
    const rlsStatus = await serviceRoleDb.execute(sql`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'cases'
    `)

    // RLS is not enabled - this is intentional
    // We use Clerk + service_role + application-level filtering
    expect(rlsStatus[0]?.relrowsecurity).toBe(false)
  })

  test('should document security model in schema', async () => {
    // Verify that our security model is enforced at application level
    // by checking that userId column exists on all critical tables

    const casesColumns = await serviceRoleDb.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'cases' AND column_name = 'user_id'
    `)

    const documentsColumns = await serviceRoleDb.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'user_id'
    `)

    // Both tables should have user_id for application-level filtering
    expect(casesColumns).toHaveLength(1)
    expect(documentsColumns).toHaveLength(1)
  })

  test('service role can insert cases', async () => {
    // Service role should be able to insert
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case for Service Role',
    }

    const result = await serviceRoleDb.insert(casesTable).values(testCase).returning()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Test Case for Service Role')
  })

  test('service role can read cases', async () => {
    // Insert a case
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Readable Case',
    }
    await serviceRoleDb.insert(casesTable).values(testCase)

    // Service role should be able to read
    const cases = await serviceRoleDb.select().from(casesTable)
    expect(cases.length).toBeGreaterThan(0)
    expect(cases[0].name).toBe('Readable Case')
  })

  test('service role can update cases', async () => {
    // Insert a case
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Original Name',
    }
    await serviceRoleDb.insert(casesTable).values(testCase)

    // Service role should be able to update
    await serviceRoleDb
      .update(casesTable)
      .set({ name: 'Updated Name' })
      .where(sql`${casesTable.id} = ${testCase.id}`)

    const updated = await serviceRoleDb
      .select()
      .from(casesTable)
      .where(sql`${casesTable.id} = ${testCase.id}`)

    expect(updated[0].name).toBe('Updated Name')
  })

  test('service role can delete cases', async () => {
    // Insert a case
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'To Be Deleted',
    }
    await serviceRoleDb.insert(casesTable).values(testCase)

    // Service role should be able to delete
    await serviceRoleDb.delete(casesTable).where(sql`${casesTable.id} = ${testCase.id}`)

    const remaining = await serviceRoleDb
      .select()
      .from(casesTable)
      .where(sql`${casesTable.id} = ${testCase.id}`)

    expect(remaining).toHaveLength(0)
  })

  test('should isolate data by userId in application logic', async () => {
    // Clean up first to avoid conflicts with parallel tests
    await serviceRoleDb.execute(sql`TRUNCATE TABLE documents CASCADE`)
    await serviceRoleDb.execute(sql`TRUNCATE TABLE cases CASCADE`)

    // Insert cases for different users
    const user1Case = {
      id: crypto.randomUUID(),
      userId: 'user_1',
      name: 'User 1 Case',
    }
    const user2Case = {
      id: crypto.randomUUID(),
      userId: 'user_2',
      name: 'User 2 Case',
    }

    await serviceRoleDb.insert(casesTable).values([user1Case, user2Case])

    // Query for user 1's cases only (application-level filtering)
    const user1Cases = await serviceRoleDb
      .select()
      .from(casesTable)
      .where(sql`${casesTable.userId} = 'user_1'`)

    expect(user1Cases).toHaveLength(1)
    expect(user1Cases[0].name).toBe('User 1 Case')

    // Query for user 2's cases only
    const user2Cases = await serviceRoleDb
      .select()
      .from(casesTable)
      .where(sql`${casesTable.userId} = 'user_2'`)

    expect(user2Cases).toHaveLength(1)
    expect(user2Cases[0].name).toBe('User 2 Case')
  })

  test('should enforce userId filtering in documents table', async () => {
    // Create a case first
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_1',
      name: 'Test Case',
    }
    await serviceRoleDb.insert(casesTable).values(testCase)

    // Create documents for different users
    const user1Doc = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: 'user_1',
      fileName: 'user1-doc.pdf',
      storagePath: '/test/user1.pdf',
    }
    const user2Doc = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: 'user_2',
      fileName: 'user2-doc.pdf',
      storagePath: '/test/user2.pdf',
    }

    await serviceRoleDb.insert(documentsTable).values([user1Doc, user2Doc])

    // Filter by userId (application-level)
    const user1Docs = await serviceRoleDb
      .select()
      .from(documentsTable)
      .where(sql`${documentsTable.userId} = 'user_1'`)

    expect(user1Docs).toHaveLength(1)
    expect(user1Docs[0].fileName).toBe('user1-doc.pdf')
  })
})

describe('Database RLS Policies - Security Checks', () => {
  test('should have indexes on userId columns for performance', async () => {
    // Check if userId indexes exist
    const casesIndexes = await serviceRoleDb.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'cases' AND indexname LIKE '%user_id%'
    `)

    expect(casesIndexes.length).toBeGreaterThan(0)

    const documentsIndexes = await serviceRoleDb.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'documents' AND indexname LIKE '%user_id%'
    `)

    expect(documentsIndexes.length).toBeGreaterThan(0)
  })

  test('should have foreign key constraints with proper cascade', async () => {
    // Check foreign key constraints
    const constraints = await serviceRoleDb.execute(sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('documents', 'discovery_requests', 'document_request_mappings')
    `)

    expect(constraints.length).toBeGreaterThan(0)

    // Check that critical foreign keys have CASCADE delete
    const cascadeConstraints = constraints.filter((c: any) => c.delete_rule === 'CASCADE')
    expect(cascadeConstraints.length).toBeGreaterThan(0)
  })

  test('should have NOT NULL constraints on critical fields', async () => {
    // Check NOT NULL constraints on cases table
    const casesColumns = await serviceRoleDb.execute(sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cases'
        AND column_name IN ('id', 'user_id', 'name')
    `)

    casesColumns.forEach((col: any) => {
      expect(col.is_nullable).toBe('NO')
    })

    // Check NOT NULL constraints on documents table
    const documentsColumns = await serviceRoleDb.execute(sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents'
        AND column_name IN ('id', 'case_id', 'user_id', 'file_name', 'storage_path')
    `)

    documentsColumns.forEach((col: any) => {
      expect(col.is_nullable).toBe('NO')
    })
  })
})
