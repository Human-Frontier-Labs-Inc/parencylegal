import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { casesTable } from '@/db/schema/cases-schema'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updating a case
const updateCaseSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().optional(),
  opposingParty: z.string().optional(),
  caseNumber: z.string().optional(),
  status: z.enum(['active', 'discovery', 'trial_prep', 'settlement', 'closed']).optional(),
  dropboxFolderPath: z.string().optional(),
  dropboxFolderId: z.string().optional(),
  notes: z.string().optional(),
  // Explicitly exclude userId from updates
  userId: z.never().optional(),
})

// GET /api/cases/[id] - Get a single case by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Fetch case
    const cases = await db
      .select()
      .from(casesTable)
      .where(sql`${casesTable.id} = ${id}`)
      .limit(1)

    if (cases.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    const caseData = cases[0]

    // Check authorization
    if (caseData.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json(caseData)
  } catch (error) {
    console.error('Error fetching case:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/cases/[id] - Update a case
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

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

    const validation = updateCaseSchema.safeParse(body)
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

    // Check if case exists and user owns it
    const existingCases = await db
      .select()
      .from(casesTable)
      .where(sql`${casesTable.id} = ${id}`)
      .limit(1)

    if (existingCases.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    const existingCase = existingCases[0]

    // Check authorization
    if (existingCase.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Update case (userId is excluded from schema, so it can't be changed)
    const [updatedCase] = await db
      .update(casesTable)
      .set(validation.data)
      .where(sql`${casesTable.id} = ${id}`)
      .returning()

    return NextResponse.json(updatedCase)
  } catch (error) {
    console.error('Error updating case:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/cases/[id] - Delete a case
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Check if case exists and user owns it
    const existingCases = await db
      .select()
      .from(casesTable)
      .where(sql`${casesTable.id} = ${id}`)
      .limit(1)

    if (existingCases.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    const existingCase = existingCases[0]

    // Check authorization
    if (existingCase.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete case (cascade delete will handle related records)
    await db
      .delete(casesTable)
      .where(sql`${casesTable.id} = ${id}`)

    return NextResponse.json({
      message: 'Case deleted successfully',
      deletedId: id,
    })
  } catch (error) {
    console.error('Error deleting case:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
