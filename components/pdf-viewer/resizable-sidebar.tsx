'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
  onWidthChange,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return

      const container = sidebarRef.current.parentElement
      if (!container) return

      const newWidth = e.clientX - container.getBoundingClientRect().left
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth)
        onWidthChange?.(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, minWidth, maxWidth, onWidthChange])

  return (
    <div className="relative flex h-full">
      <div
        ref={sidebarRef}
        className={cn(
          'bg-card border-r border-border transition-all duration-200 overflow-hidden flex flex-col',
          isCollapsed ? 'w-0' : `w-[${width}px]`
        )}
        style={{ width: isCollapsed ? 0 : width }}
      >
        <div className="flex-1 overflow-auto p-4 space-y-4">{children}</div>
      </div>

      <div
        onMouseDown={() => setIsResizing(true)}
        className={cn(
          'w-1 bg-border hover:bg-primary cursor-col-resize transition-colors',
          !isCollapsed && 'hover:w-1'
        )}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-0 top-4 h-8 w-8 p-0 z-10 translate-x-0"
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>
    </div>
  )
}
