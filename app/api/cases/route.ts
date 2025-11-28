import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { casesTable } from '@/db/schema/cases-schema'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for creating a case
const createCaseSchema = z.object({
  name: z.string().min(1, 'Case name is required'),
  clientName: z.string().optional(),
  opposingParty: z.string().optional(),
  caseNumber: z.string().optional(),
  status: z.enum(['active', 'discovery', 'trial_prep', 'settlement', 'closed']).optional().default('active'),
  dropboxFolderPath: z.string().optional(),
  dropboxFolderId: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/cases - List all cases for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build query with filters
    const cases = await db
      .select()
      .from(casesTable)
      .where(
        status
          ? sql`${casesTable.userId} = ${userId} AND ${casesTable.status} = ${status}`
          : sql`${casesTable.userId} = ${userId}`
      )

    return NextResponse.json({
      cases,
      total: cases.length,
    })
  } catch (error) {
    console.error('Error fetching cases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/cases - Create a new case
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const validation = createCaseSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    // Create case with userId from auth
    const newCase = {
      id: crypto.randomUUID(),
      userId,
      ...validation.data,
    }

    const [createdCase] = await db.insert(casesTable).values(newCase).returning()

    return NextResponse.json(createdCase, { status: 201 })
  } catch (error) {
    console.error('Error creating case:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
