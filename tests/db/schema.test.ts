import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { casesTable } from '@/db/schema/cases-schema'
import { documentsTable } from '@/db/schema/documents-schema'
import { discoveryRequestsTable } from '@/db/schema/discovery-requests-schema'
import { documentRequestMappingsTable } from '@/db/schema/document-request-mappings-schema'
import { aiChatSessionsTable } from '@/db/schema/ai-chat-sessions-schema'
import { syncHistoryTable } from '@/db/schema/sync-history-schema'
import { dropboxConnectionsTable } from '@/db/schema/dropbox-connections-schema'

// Test database connection
// Use the same database URL for now (in production, you'd want a separate test database)
const testDbUrl = process.env.DATABASE_URL
if (!testDbUrl) {
  console.warn('DATABASE_URL not set, tests will be skipped')
  process.exit(0)
}

const client = postgres(testDbUrl, {
  max: 1,
  onnotice: () => {}, // Suppress notices
})
const db = drizzle(client)

// Cleanup function to truncate all tables
async function cleanupDatabase() {
  try {
    await db.execute(sql`TRUNCATE TABLE ${documentRequestMappingsTable} CASCADE`)
    await db.execute(sql`TRUNCATE TABLE ${documentsTable} CASCADE`)
    await db.execute(sql`TRUNCATE TABLE ${discoveryRequestsTable} CASCADE`)
    await db.execute(sql`TRUNCATE TABLE ${aiChatSessionsTable} CASCADE`)
    await db.execute(sql`TRUNCATE TABLE ${syncHistoryTable} CASCADE`)
    await db.execute(sql`TRUNCATE TABLE ${casesTable} CASCADE`)
    await db.execute(sql`TRUNCATE TABLE ${dropboxConnectionsTable} CASCADE`)
  } catch (error) {
    console.error('Error cleaning up database:', error)
  }
}

beforeAll(async () => {
  // Ensure clean state before tests
  await cleanupDatabase()
})

beforeEach(async () => {
  // Clean up before each test
  await cleanupDatabase()
})

afterAll(async () => {
  await cleanupDatabase()
  await client.end()
})

describe('Database Schema - Cases Table', () => {
  test('should create cases table with required fields', async () => {
    // Insert a test case
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Smith v. Smith',
      clientName: 'Jane Smith',
      opposingParty: 'John Smith',
      status: 'active',
    }

    const result = await db.insert(casesTable).values(testCase).returning()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(testCase.id)
    expect(result[0].userId).toBe(testCase.userId)
    expect(result[0].name).toBe(testCase.name)
    expect(result[0].status).toBe('active')
    expect(result[0].createdAt).toBeInstanceOf(Date)
    expect(result[0].updatedAt).toBeInstanceOf(Date)
  })

  test('should enforce NOT NULL constraint on required fields', async () => {
    // Try to insert without required fields
    await expect(async () => {
      // @ts-expect-error - Testing schema constraint
      await db.insert(casesTable).values({
        id: crypto.randomUUID(),
        // Missing userId and name
      })
    }).rejects.toThrow()
  })

  test('should set default status to "active"', async () => {
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }

    const result = await db.insert(casesTable).values(testCase).returning()

    expect(result[0].status).toBe('active')
  })

  test('should auto-generate timestamps on insert', async () => {
    const beforeInsert = new Date()

    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }

    const result = await db.insert(casesTable).values(testCase).returning()

    expect(result[0].createdAt).toBeInstanceOf(Date)
    expect(result[0].updatedAt).toBeInstanceOf(Date)
    expect(result[0].createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime())
  })

  test('should update updatedAt timestamp on update', async () => {
    // Insert a case
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Original Name',
    }

    const inserted = await db.insert(casesTable).values(testCase).returning()
    const originalUpdatedAt = inserted[0].updatedAt

    // Wait a bit to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 100))

    // Update the case
    const updated = await db
      .update(casesTable)
      .set({ name: 'Updated Name' })
      .where(sql`${casesTable.id} = ${testCase.id}`)
      .returning()

    expect(updated[0].name).toBe('Updated Name')
    expect(updated[0].updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
  })
})

describe('Database Schema - Documents Table', () => {
  test('should create documents table with required fields', async () => {
    // First create a case (foreign key dependency)
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    // Now create a document
    const testDocument = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      fileName: 'test-document.pdf',
      storagePath: '/test/path.pdf',
      source: 'dropbox',
    }

    const result = await db.insert(documentsTable).values(testDocument).returning()

    expect(result).toHaveLength(1)
    expect(result[0].fileName).toBe(testDocument.fileName)
    expect(result[0].caseId).toBe(testCase.id)
    expect(result[0].source).toBe('dropbox')
  })

  test('should cascade delete documents when case is deleted', async () => {
    // Create a case
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    // Create documents for the case
    const doc1 = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      fileName: 'doc1.pdf',
      storagePath: '/test/doc1.pdf',
    }
    const doc2 = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      fileName: 'doc2.pdf',
      storagePath: '/test/doc2.pdf',
    }
    await db.insert(documentsTable).values([doc1, doc2])

    // Verify documents exist
    let documents = await db.select().from(documentsTable).where(sql`${documentsTable.caseId} = ${testCase.id}`)
    expect(documents).toHaveLength(2)

    // Delete the case
    await db.delete(casesTable).where(sql`${casesTable.id} = ${testCase.id}`)

    // Verify documents were cascade deleted
    documents = await db.select().from(documentsTable).where(sql`${documentsTable.caseId} = ${testCase.id}`)
    expect(documents).toHaveLength(0)
  })

  test('should store JSON metadata correctly', async () => {
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testMetadata = {
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      parties: ['John Doe', 'Jane Smith'],
      amounts: [1000.50, 2500.75],
      accountNumbers: ['12345', '67890'],
      summary: 'Test document summary',
    }

    const testDocument = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      fileName: 'financial-doc.pdf',
      storagePath: '/test/financial.pdf',
      metadata: testMetadata,
    }

    const result = await db.insert(documentsTable).values(testDocument).returning()

    expect(result[0].metadata).toEqual(testMetadata)
    expect(result[0].metadata?.startDate).toBe('2023-01-01')
    expect(result[0].metadata?.parties).toEqual(['John Doe', 'Jane Smith'])
  })

  test('should default needsReview to false', async () => {
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testDocument = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      fileName: 'doc.pdf',
      storagePath: '/test/doc.pdf',
    }

    const result = await db.insert(documentsTable).values(testDocument).returning()

    expect(result[0].needsReview).toBe(false)
  })
})

describe('Database Schema - Discovery Requests Table', () => {
  test('should create discovery request with required fields', async () => {
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testRequest = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      type: 'RFP',
      number: 1,
      text: 'All bank statements from January 2023 to present',
    }

    const result = await db.insert(discoveryRequestsTable).values(testRequest).returning()

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('RFP')
    expect(result[0].number).toBe(1)
    expect(result[0].status).toBe('incomplete')
    expect(result[0].completionPercentage).toBe(0)
  })

  test('should cascade delete requests when case is deleted', async () => {
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testRequest = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      type: 'RFP',
      number: 1,
      text: 'Test request',
    }
    await db.insert(discoveryRequestsTable).values(testRequest)

    // Delete the case
    await db.delete(casesTable).where(sql`${casesTable.id} = ${testCase.id}`)

    // Verify request was cascade deleted
    const requests = await db.select().from(discoveryRequestsTable).where(sql`${discoveryRequestsTable.caseId} = ${testCase.id}`)
    expect(requests).toHaveLength(0)
  })
})

describe('Database Schema - Document Request Mappings Table', () => {
  test('should create mapping between document and request', async () => {
    // Setup: Create case, document, and request
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testDocument = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      fileName: 'bank-statement.pdf',
      storagePath: '/test/bank.pdf',
    }
    await db.insert(documentsTable).values(testDocument)

    const testRequest = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      type: 'RFP',
      number: 1,
      text: 'All bank statements',
    }
    await db.insert(discoveryRequestsTable).values(testRequest)

    // Create mapping
    const testMapping = {
      id: crypto.randomUUID(),
      documentId: testDocument.id,
      requestId: testRequest.id,
      caseId: testCase.id,
      userId: testCase.userId,
      source: 'ai_suggestion',
      confidence: 85,
      reasoning: 'Document appears to be a bank statement matching the request',
    }

    const result = await db.insert(documentRequestMappingsTable).values(testMapping).returning()

    expect(result).toHaveLength(1)
    expect(result[0].documentId).toBe(testDocument.id)
    expect(result[0].requestId).toBe(testRequest.id)
    expect(result[0].confidence).toBe(85)
    expect(result[0].status).toBe('suggested')
  })

  test('should cascade delete mappings when document is deleted', async () => {
    // Setup case, document, request
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testDocument = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      fileName: 'doc.pdf',
      storagePath: '/test/doc.pdf',
    }
    await db.insert(documentsTable).values(testDocument)

    const testRequest = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      type: 'RFP',
      number: 1,
      text: 'Test',
    }
    await db.insert(discoveryRequestsTable).values(testRequest)

    const testMapping = {
      id: crypto.randomUUID(),
      documentId: testDocument.id,
      requestId: testRequest.id,
      caseId: testCase.id,
      userId: testCase.userId,
      source: 'manual_addition',
    }
    await db.insert(documentRequestMappingsTable).values(testMapping)

    // Delete document
    await db.delete(documentsTable).where(sql`${documentsTable.id} = ${testDocument.id}`)

    // Verify mapping was cascade deleted
    const mappings = await db.select().from(documentRequestMappingsTable).where(sql`${documentRequestMappingsTable.documentId} = ${testDocument.id}`)
    expect(mappings).toHaveLength(0)
  })
})

describe('Database Schema - AI Chat Sessions Table', () => {
  test('should create AI chat session with conversation history', async () => {
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testMessages = [
      { role: 'system' as const, content: 'You are a helpful assistant', timestamp: new Date().toISOString() },
      { role: 'user' as const, content: 'Classify this document', timestamp: new Date().toISOString() },
      { role: 'assistant' as const, content: 'This appears to be a financial document', timestamp: new Date().toISOString() },
    ]

    const testSession = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      type: 'classification',
      messages: testMessages,
      totalInputTokens: 100,
      totalOutputTokens: 50,
      cachedInputTokens: 80,
      totalCost: 5, // 5 cents
    }

    const result = await db.insert(aiChatSessionsTable).values(testSession).returning()

    expect(result).toHaveLength(1)
    expect(result[0].messages).toEqual(testMessages)
    expect(result[0].totalInputTokens).toBe(100)
    expect(result[0].status).toBe('active')
  })

  test('should track token usage and costs', async () => {
    const testCase = {
      id: crypto.randomUUID(),
      userId: 'user_test123',
      name: 'Test Case',
    }
    await db.insert(casesTable).values(testCase)

    const testSession = {
      id: crypto.randomUUID(),
      caseId: testCase.id,
      userId: testCase.userId,
      type: 'discovery_mapping',
      totalInputTokens: 500,
      totalOutputTokens: 200,
      cachedInputTokens: 400,
      totalCost: 25, // 25 cents
    }

    const result = await db.insert(aiChatSessionsTable).values(testSession).returning()

    expect(result[0].totalInputTokens).toBe(500)
    expect(result[0].totalOutputTokens).toBe(200)
    expect(result[0].cachedInputTokens).toBe(400)
    expect(result[0].totalCost).toBe(25)
  })
})
