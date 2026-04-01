'use server'

import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS on reference tables
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function fetchEventTypesAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from('calendar_event_types')
      .select('id, name')
    
    if (error) {
      console.error('[v0] Error fetching event types:', error)
      return { success: false, error: error.message, data: null }
    }
    
    return { success: true, data, error: null }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] Exception fetching event types:', msg)
    return { success: false, error: msg, data: null }
  }
}

export async function fetchPrioritiesAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from('priority')
      .select('id, name')
    
    if (error) {
      console.error('[v0] Error fetching priorities:', error)
      return { success: false, error: error.message, data: null }
    }
    
    return { success: true, data, error: null }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] Exception fetching priorities:', msg)
    return { success: false, error: msg, data: null }
  }
}

export async function createCalendarEventAction(input: {
  date: string
  projectId: number
  users: string
  eventType: number | null
  eventPriority: number | null
  content: string
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from('calender_events')
      .insert({
        date: input.date,
        project_id: input.projectId,
        users: input.users,
        event_type: input.eventType,
        event_priority: input.eventPriority,
        content: input.content,
      })
      .select()
      .single()
    
    if (error) {
      console.error('[v0] Error creating event:', error)
      return { success: false, error: error.message, data: null }
    }
    
    return { success: true, data, error: null }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] Exception creating event:', msg)
    return { success: false, error: msg, data: null }
  }
}

export async function fetchCalendarEventsAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from('calender_events')
      .select('*')
      .order('date', { ascending: true })
    
    console.log('[v0] Calendar events fetch result:', { data, error })
    
    if (error) {
      console.error('[v0] Error fetching calendar events:', error)
      return { success: false, error: error.message, data: null }
    }
    
    return { success: true, data, error: null }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] Exception fetching calendar events:', msg)
    return { success: false, error: msg, data: null }
  }
}
