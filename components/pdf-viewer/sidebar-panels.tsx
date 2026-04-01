'use client'

/**
 * Sidebar Panel System
 * Modular, stackable panels that appear one at a time in the right sidebar
 * Each panel can be independently enabled/disabled
 */

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SidebarPanelProps {
  isActive: boolean
  onClose?: () => void
  title: string
  icon: ReactNode
}

export const SidebarPanel: React.FC<SidebarPanelProps & { children: ReactNode }> = ({
  isActive,
  onClose,
  title,
  icon,
  children,
}) => {
  if (!isActive) return null

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="Close panel"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  )
}

/**
 * Properties Panel - Edit selected markup properties
 */
export const PropertiesPanelContent: React.FC<{ markup: any; onUpdate: (data: any) => void }> = ({
  markup,
  onUpdate,
}) => {
  if (!markup) {
    return <p className="text-xs text-muted-foreground">Select a markup to view properties</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium">Type</label>
        <p className="text-sm text-muted-foreground capitalize">{markup.type}</p>
      </div>
      <div>
        <label className="text-xs font-medium">Page</label>
        <p className="text-sm text-muted-foreground">{markup.pageNumber}</p>
      </div>
      <div>
        <label className="text-xs font-medium">Author</label>
        <p className="text-sm text-muted-foreground">{markup.author || 'Unknown'}</p>
      </div>
      {markup.status && (
        <div>
          <label className="text-xs font-medium">Status</label>
          <select
            value={markup.status}
            onChange={(e) => onUpdate({ ...markup, status: e.target.value })}
            className="w-full px-2 py-1 text-xs border rounded bg-background"
          >
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      )}
    </div>
  )
}

/**
 * Comments Panel - View and add comments
 */
export const CommentsPanelContent: React.FC<{ 
  comments: any[] 
  onAddComment: (text: string) => void 
  isLoading?: boolean 
}> = ({ comments, onAddComment, isLoading }) => {
  const [newComment, setNewComment] = React.useState('')

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment)
      setNewComment('')
    }
  }

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-muted p-2 rounded text-xs space-y-1">
              <p className="font-medium">{comment.author || 'Unknown'}</p>
              <p>{comment.content}</p>
              <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Comment */}
      <div className="border-t pt-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full px-2 py-1 text-xs border rounded bg-background resize-none h-20"
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="mt-2 w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </div>
  )
}

/**
 * History Panel - View version history
 */
export const HistoryPanelContent: React.FC<{ versions: any[]; isLoading?: boolean }> = ({
  versions,
  isLoading,
}) => {
  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading history...</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No history available</p>
      ) : (
        versions.map((version, idx) => (
          <div key={version.id} className="bg-muted p-2 rounded text-xs space-y-1 border-l-2 border-primary">
            <div className="flex justify-between">
              <span className="font-medium">v{versions.length - idx}</span>
              <span className="capitalize text-primary">{version.change_type}</span>
            </div>
            <p className="text-muted-foreground">{version.changed_by}</p>
            <p className="text-xs text-muted-foreground">{new Date(version.changed_at).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  )
}
