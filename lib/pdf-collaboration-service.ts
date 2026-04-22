'use client'

/**
 * PDF Collaboration Service
 * Handles real-time collaboration features using Supabase Realtime
 * - Live user presence/sessions
 * - Markup version history
 * - Comments and annotations
 * - Task assignments
 */

import { supabase } from '@/lib/supabase/client'
import { RealtimeChannel, REALTIME_LISTEN_TYPES } from '@supabase/supabase-js'

export interface CollaborationEvent {
  type: 'markup_created' | 'markup_updated' | 'markup_deleted' | 'comment_added' | 'user_joined' | 'user_left'
  userId: string
  userName: string
  timestamp: string
  data: any
}

export interface UserSession {
  userId: string
  userName: string
  currentPage: number
  zoom: number
  viewportX: number
  viewportY: number
  lastActive: string
}

export class PDFCollaborationService {
  private get supabase() {
    return supabase
  }
  private sessionChannels: Map<string, RealtimeChannel> = new Map()
  private eventListeners: Map<string, Set<(event: CollaborationEvent) => void>> = new Map()
  private currentUser: { id: string; name: string } | null = null

  /**
   * Initialize collaboration service with current user
   */
  async initialize(userId: string, userName: string) {
    this.currentUser = { id: userId, name: userName }
  }

  /**
   * Start a collaboration session for a PDF
   */
  async startSession(pdfFileId: string) {
    try {
      // Create session record in database
      const { data: session, error } = await this.supabase
        .from('pdf_sessions_collaboration')
        .insert({
          pdf_file_id: pdfFileId,
          user_id: this.currentUser?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Subscribe to realtime updates for this PDF
      const channel = this.supabase.channel(`pdf:${pdfFileId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'pdf_sessions_collaboration',
            filter: `pdf_file_id=eq.${pdfFileId}`,
          },
          (payload: any) => this.handleSessionChange(payload)
        )
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'pdf_markup_versions',
            filter: `markup_id=cs.${pdfFileId}`,
          },
          (payload: any) => this.handleSessionChange(payload)
        )
        .subscribe()

      this.sessionChannels.set(pdfFileId, channel)
      return session
    } catch (error) {
      console.error('[v0] Error starting collaboration session:', error)
      throw error
    }
  }

  /**
   * End collaboration session
   */
  async endSession(pdfFileId: string) {
    try {
      const { error } = await this.supabase
        .from('pdf_sessions_collaboration')
        .update({ ended_at: new Date().toISOString() })
        .eq('pdf_file_id', pdfFileId)
        .eq('user_id', this.currentUser?.id)

      if (error) throw error

      const channel = this.sessionChannels.get(pdfFileId)
      if (channel) {
        await this.supabase.removeChannel(channel)
        this.sessionChannels.delete(pdfFileId)
      }
    } catch (error) {
      console.error('[v0] Error ending collaboration session:', error)
    }
  }

  /**
   * Track viewport state for user presence
   */
  async updateViewport(pdfFileId: string, viewport: Partial<UserSession>) {
    try {
      await this.supabase
        .from('pdf_sessions_collaboration')
        .update({
          viewport_x: viewport.viewportX,
          viewport_y: viewport.viewportY,
          zoom_level: viewport.zoom,
          current_page: viewport.currentPage,
        })
        .eq('pdf_file_id', pdfFileId)
        .eq('user_id', this.currentUser?.id)
    } catch (error) {
      console.error('[v0] Error updating viewport:', error)
    }
  }

  /**
   * Record markup version change
   */
  async recordMarkupVersion(markupId: string, changeType: 'created' | 'modified' | 'deleted', newData: any, previousData?: any) {
    try {
      // Get current version number
      const { data: versions } = await this.supabase
        .from('pdf_markup_versions')
        .select('version_number')
        .eq('markup_id', markupId)
        .order('version_number', { ascending: false })
        .limit(1)

      const versionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1

      const { data, error } = await this.supabase
        .from('pdf_markup_versions')
        .insert({
          markup_id: markupId,
          version_number: versionNumber,
          changed_by: this.currentUser?.id,
          change_type: changeType,
          previous_data: previousData,
          new_data: newData,
        })
        .select()
        .single()

      if (error) throw error

      this.emitEvent({
        type: 'markup_updated',
        userId: this.currentUser?.id || '',
        userName: this.currentUser?.name || '',
        timestamp: new Date().toISOString(),
        data,
      })

      return data
    } catch (error) {
      console.error('[v0] Error recording markup version:', error)
      throw error
    }
  }

  /**
   * Add comment to a markup
   */
  async addComment(markupId: string, content: string) {
    try {
      const { data, error } = await this.supabase
        .from('pdf_markup_comments')
        .insert({
          markup_id: markupId,
          user_id: this.currentUser?.id,
          content,
        })
        .select()
        .single()

      if (error) throw error

      this.emitEvent({
        type: 'comment_added',
        userId: this.currentUser?.id || '',
        userName: this.currentUser?.name || '',
        timestamp: new Date().toISOString(),
        data,
      })

      return data
    } catch (error) {
      console.error('[v0] Error adding comment:', error)
      throw error
    }
  }

  /**
   * Get all comments for a markup
   */
  async getComments(markupId: string) {
    try {
      const { data, error } = await this.supabase
        .from('pdf_markup_comments')
        .select('*')
        .eq('markup_id', markupId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('[v0] Error fetching comments:', error)
      return []
    }
  }

  /**
   * Get active users on PDF
   */
  async getActiveSessions(pdfFileId: string) {
    try {
      const { data, error } = await this.supabase
        .from('pdf_sessions_collaboration')
        .select('*')
        .eq('pdf_file_id', pdfFileId)
        .is('ended_at', null)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('[v0] Error fetching active sessions:', error)
      return []
    }
  }

  /**
   * Get markup version history
   */
  async getMarkupHistory(markupId: string) {
    try {
      const { data, error } = await this.supabase
        .from('pdf_markup_versions')
        .select('*')
        .eq('markup_id', markupId)
        .order('version_number', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('[v0] Error fetching markup history:', error)
      return []
    }
  }

  /**
   * Register event listener
   */
  on(eventType: CollaborationEvent['type'], callback: (event: CollaborationEvent) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)?.add(callback)

    return () => {
      this.eventListeners.get(eventType)?.delete(callback)
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: CollaborationEvent) {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach((callback) => callback(event))
    }
  }

  /**
   * Handle session changes from realtime
   */
  private handleSessionChange(payload: any) {
    const { eventType, new: newData, old: oldData } = payload

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      this.emitEvent({
        type: 'user_joined',
        userId: newData.user_id,
        userName: newData.user_id,
        timestamp: new Date().toISOString(),
        data: newData,
      })
    } else if (eventType === 'DELETE') {
      this.emitEvent({
        type: 'user_left',
        userId: oldData.user_id,
        userName: oldData.user_id,
        timestamp: new Date().toISOString(),
        data: oldData,
      })
    }
  }

  /**
   * Handle markup changes from realtime
   */
  private handleMarkupChange(payload: any) {
    const { eventType, new: newData } = payload

    if (eventType === 'INSERT') {
      this.emitEvent({
        type: 'markup_created',
        userId: newData.changed_by,
        userName: newData.changed_by,
        timestamp: new Date().toISOString(),
        data: newData,
      })
    } else if (eventType === 'UPDATE') {
      this.emitEvent({
        type: 'markup_updated',
        userId: newData.changed_by,
        userName: newData.changed_by,
        timestamp: new Date().toISOString(),
        data: newData,
      })
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect() {
    for (const channel of this.sessionChannels.values()) {
      await this.supabase.removeChannel(channel)
    }
    this.sessionChannels.clear()
    this.eventListeners.clear()
  }
}

export const collaborationService = new PDFCollaborationService()
