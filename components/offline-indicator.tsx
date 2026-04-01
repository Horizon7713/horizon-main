'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi, Upload, AlertCircle } from 'lucide-react'
import { offlineQueue } from '@/lib/offline-queue'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [hasErrors, setHasErrors] = useState(false)

  useEffect(() => {
    // Initial status
    setIsOnline(offlineQueue.getIsOnline())
    updateQueueStatus()

    // Subscribe to changes
    const unsubscribe = offlineQueue.subscribe(() => {
      setIsOnline(offlineQueue.getIsOnline())
      updateQueueStatus()
    })

    return unsubscribe
  }, [])

  const updateQueueStatus = async () => {
    const status = await offlineQueue.getQueueStatus()
    setQueueCount(status.count)
    setHasErrors(status.hasErrors)
  }

  if (isOnline && queueCount === 0) {
    return null // Don't show indicator when online with no pending messages
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground shadow-lg">
          <WifiOff className="size-4" />
          <span className="text-sm font-medium">Offline</span>
          {queueCount > 0 && (
            <span className="text-xs bg-background/20 px-2 py-0.5 rounded">
              {queueCount} pending
            </span>
          )}
        </div>
      )}

      {isOnline && queueCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-lg">
          <Upload className="size-4 animate-pulse" />
          <span className="text-sm font-medium">Syncing {queueCount} message{queueCount !== 1 ? 's' : ''}...</span>
        </div>
      )}

      {hasErrors && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white shadow-lg mt-2">
          <AlertCircle className="size-4" />
          <span className="text-sm">Some messages failed to sync</span>
        </div>
      )}
    </div>
  )
}
