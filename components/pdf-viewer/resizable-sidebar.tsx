'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ResizableSidebarProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  onWidthChange?: (width: number) => void
}

export function ResizableSidebar({
  children,
  defaultWidth = 320,
  minWidth = 250,
  maxWidth = 500,
  onWidthChange,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const lastExpandedWidthRef = useRef(defaultWidth)

  useEffect(() => {
    setWidth(defaultWidth)
    lastExpandedWidthRef.current = defaultWidth
  }, [defaultWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !rootRef.current) return

      const rect = rootRef.current.getBoundingClientRect()
      const rawWidth = rect.right - e.clientX
      const nextWidth = Math.max(minWidth, Math.min(maxWidth, rawWidth))

      setWidth((prev) => {
        if (prev !== nextWidth) {
          lastExpandedWidthRef.current = nextWidth
          onWidthChange?.(nextWidth)
        }
        return nextWidth
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, minWidth, maxWidth, onWidthChange])

  const toggleCollapsed = () => {
    if (isCollapsed) {
      const restoredWidth = Math.max(minWidth, Math.min(maxWidth, lastExpandedWidthRef.current))
      setWidth(restoredWidth)
      setIsCollapsed(false)
      onWidthChange?.(restoredWidth)
      return
    }

    lastExpandedWidthRef.current = width
    setIsCollapsed(true)
    onWidthChange?.(0)
  }

  return (
    <div ref={rootRef} className="relative flex h-full">
      {!isCollapsed && (
        <div
          onMouseDown={() => setIsResizing(true)}
          className="w-1 cursor-col-resize bg-border transition-colors hover:bg-primary"
          title="Resize sidebar"
        />
      )}

      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden border-l border-border bg-card transition-[width] duration-200',
          isCollapsed && 'w-0 border-l-0',
        )}
        style={{ width: isCollapsed ? 0 : width }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="absolute left-0 top-4 z-10 h-8 w-8 -translate-x-1/2 rounded-full border bg-background shadow-sm"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>

      {isCollapsed && (
        <div className="relative flex h-full w-10 items-start justify-center border-l border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="mt-4 h-8 w-8 rounded-full border bg-background shadow-sm"
            title="Expand"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}