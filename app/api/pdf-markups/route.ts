import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Markup } from '@/lib/pdf-viewer-types'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { searchParams } = new URL(request.url)
    const pdfFileId = searchParams.get('pdfFileId')
    const pageNumber = searchParams.get('pageNumber')

    if (!pdfFileId) {
      return NextResponse.json({ error: 'pdfFileId is required' }, { status: 400 })
    }

    const query = supabase.from('pdf_markups').select('*').eq('pdf_file_id', pdfFileId)

    if (pageNumber) {
      query.eq('page_number', pageNumber)
    }

    const { data, error } = await query

    if (error) {
      console.error('[v0] Error fetching markups:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[v0] Error in GET /api/pdf-markups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pdfFileId, markups } = body

    if (!pdfFileId || !Array.isArray(markups)) {
      return NextResponse.json(
        { error: 'pdfFileId and markups array are required' },
        { status: 400 }
      )
    }

    // Delete existing markups for this PDF and insert new ones
    await supabase.from('pdf_markups').delete().eq('pdf_file_id', pdfFileId)

    const markupsToInsert = markups.map((markup: Markup) => ({
      pdf_file_id: pdfFileId,
      markup_type: markup.type,
      page_number: markup.pageNumber,
      markup_data: markup,
      user_id: sessionData.session.user.id,
      created_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('pdf_markups')
      .insert(markupsToInsert)
      .select()

    if (error) {
      console.error('[v0] Error saving markups:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (error) {
    console.error('[v0] Error in POST /api/pdf-markups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
