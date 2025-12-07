import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { casesTable } from '@/db/schema/cases-schema'
import { sql } from 'drizzle-orm'
import { fetchParentData, ParencySyncError } from '@/lib/parency-sync'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

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

    // Check if parent sync is configured
    if (!caseData.parentSyncToken) {
      return NextResponse.json(
        { error: 'No parent connected to this case' },
        { status: 400 }
      )
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const typesParam = searchParams.get('types')
    const sinceParam = searchParams.get('since')

    const types = typesParam
      ? typesParam.split(',').filter(t => ['incidents', 'expenses', 'calendar', 'messages'].includes(t)) as any[]
      : undefined

    // Fetch data from parent app
    const data = await fetchParentData(
      caseData.parentSyncToken,
      types,
      sinceParam || undefined
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching parent sync data:', error)

    if (error instanceof ParencySyncError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
