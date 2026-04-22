'use client'

// ============================================================================
// usePresence — lightweight multi-user presence via Supabase Presence
//
// Tracks: userId, userName, currentPage, cursor position, viewport
// No database writes — purely ephemeral Presence channel state.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PresenceUser {
  userId: string
  userName: string
  color: string
  currentPage: number
  cursorX: number | null
  cursorY: number | null
  zoom: number
  lastActive: string
}

export interface UsePresenceReturn {
  /** All other users currently viewing this document */
  peers: PresenceUser[]
  /** Update our own presence state (debounced internally) */
  updatePresence: (partial: Partial<Pick<PresenceUser, 'currentPage' | 'cursorX' | 'cursorY' | 'zoom'>>) => void
  /** Number of peers (excluding self) */
  peerCount: number
}

// Stable color palette for user avatars
const USER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

function pickColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function usePresence(
  documentId: string | null,
  userId: string | null,
  userName: string | null,
): UsePresenceReturn {
  const [peers, setPeers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceRef = useRef<Partial<PresenceUser>>({})
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ------------------------------------------------------------------
  // Join / leave channel
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!documentId || !userId) {
      setPeers([])
      return
    }

    const color = pickColor(userId)
    const initialPresence: PresenceUser = {
      userId,
      userName: userName ?? 'Anonymous',
      color,
      currentPage: 1,
      cursorX: null,
      cursorY: null,
      zoom: 1,
      lastActive: new Date().toISOString(),
    }
    presenceRef.current = initialPresence

    const channel = supabase.channel(`presence:${documentId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, PresenceUser[]>
        const others: PresenceUser[] = []
        for (const [key, presences] of Object.entries(state)) {
          if (key === userId) continue
          const latest = presences[presences.length - 1] as PresenceUser | undefined
          if (latest) others.push(latest)
        }
        setPeers(others)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(initialPresence)
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [documentId, userId, userName])

  // ------------------------------------------------------------------
  // Throttled presence updates (max 10 updates/sec)
  // ------------------------------------------------------------------
  const updatePresence = useCallback(
    (partial: Partial<Pick<PresenceUser, 'currentPage' | 'cursorX' | 'cursorY' | 'zoom'>>) => {
      presenceRef.current = {
        ...presenceRef.current,
        ...partial,
        lastActive: new Date().toISOString(),
      }

      if (throttleRef.current) return
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null
        channelRef.current?.track(presenceRef.current as PresenceUser).catch(() => {})
      }, 100)
    },
    [],
  )

  return {
    peers,
    updatePresence,
    peerCount: peers.length,
  }
}
