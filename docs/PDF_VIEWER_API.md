# PDF Viewer API Documentation

## State Management API

### usePDFViewer Hook

```typescript
const { state, dispatch, collaborationService } = usePDFViewer()
```

**State Properties**:
- `pdfFileId`: Current PDF file identifier
- `currentPage`: Active page number (1-indexed)
- `totalPages`: Total pages in PDF
- `zoom`: Zoom level (0.25 to 3)
- `panX, panY`: Pan offset in pixels
- `markups`: Array of all markups
- `selectedMarkupId`: Currently selected markup ID
- `activeTool`: Current drawing tool
- `drawingScale`: User-defined measurement scale
- `activePanel`: Active sidebar panel
- `activeSessions`: Array of active user sessions
- `comments`: Object mapping markup IDs to comments
- `markupVersions`: Object mapping markup IDs to version histories

### Dispatch Actions

```typescript
// PDF Navigation
dispatch({ type: 'SET_PDF', payload: { pdfFileId, totalPages } })
dispatch({ type: 'SET_PAGE', payload: 3 })
dispatch({ type: 'SET_ZOOM', payload: 1.5 })
dispatch({ type: 'SET_PAN', payload: { x: 100, y: 200 } })

// Markup Management
dispatch({ type: 'ADD_MARKUP', payload: markupObject })
dispatch({ type: 'UPDATE_MARKUP', payload: updatedMarkup })
dispatch({ type: 'DELETE_MARKUP', payload: 'markup-id' })
dispatch({ type: 'SET_MARKUPS', payload: [markup1, markup2] })
dispatch({ type: 'SELECT_MARKUP', payload: 'markup-id' })

// Tool Management
dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'line' })
dispatch({ type: 'SET_DRAWING_SCALE', payload: { pixelDistance: 100, realWorldDistance: 10, unit: 'ft' } })

// UI State
dispatch({ type: 'SET_ACTIVE_PANEL', payload: 'comments' })
dispatch({ type: 'SET_SIDEBAR_WIDTH', payload: 350 })

// Collaboration
dispatch({ type: 'UPDATE_ACTIVE_SESSIONS', payload: sessions })
dispatch({ type: 'UPDATE_COMMENTS', payload: { markupId: 'id', comments: [...] } })
dispatch({ type: 'UPDATE_MARKUP_VERSIONS', payload: { markupId: 'id', versions: [...] } })
```

## Collaboration Service API

### Initialize
```typescript
await collaborationService.initialize('user-id', 'User Name')
```

### Session Management
```typescript
await collaborationService.startSession(pdfFileId)
await collaborationService.endSession(pdfFileId)
await collaborationService.updateViewport(pdfFileId, {
  viewportX: 100,
  viewportY: 200,
  zoom: 1.5,
  currentPage: 3
})
```

### Markup Versioning
```typescript
await collaborationService.recordMarkupVersion(
  markupId,
  'created', // or 'modified', 'deleted'
  newData,
  previousData
)

const history = await collaborationService.getMarkupHistory(markupId)
```

### Comments
```typescript
await collaborationService.addComment(markupId, 'Comment text')
const comments = await collaborationService.getComments(markupId)
```

### Session Tracking
```typescript
const sessions = await collaborationService.getActiveSessions(pdfFileId)
```

### Event Subscription
```typescript
const unsubscribe = collaborationService.on('markup_created', (event) => {
  console.log('New markup created:', event)
})

// Available events:
// - 'markup_created'
// - 'markup_updated'
// - 'markup_deleted'
// - 'comment_added'
// - 'user_joined'
// - 'user_left'
```

### Cleanup
```typescript
await collaborationService.disconnect()
```

## Performance Manager API

### Cache Management
```typescript
const canvas = performanceManager.getPageFromCache(pageNumber)
performanceManager.cachePageCanvas(pageNumber, canvas)
performanceManager.updateVisibleRange(currentPage, zoom, viewport)

const shouldPreload = performanceManager.shouldPreloadPage(2)
const queue = performanceManager.getPriorityRenderQueue(totalPages)

performanceManager.clearCache()
const stats = performanceManager.getCacheStats()
```

### Utilities
```typescript
performanceManager.optimizeCanvasContext(ctx)

const debouncedFn = performanceManager.debounceViewportUpdate(callback, 200)
const throttledFn = performanceManager.throttleRender(callback, 16)
```

## Markup Virtualization API

```typescript
const virtualizer = new MarkupVirtualizer()

// Filter by page
const pageMarkups = virtualizer.filterMarkupsByPage(markups, 3)

// Filter by viewport
const visibleMarkups = virtualizer.filterMarkupsByViewport(
  markups,
  viewportBounds,
  zoom
)
```

## Component Props

### PDFCanvasViewer
```typescript
interface PDFCanvasViewerProps {
  pdfUrl: string
  markups: Markup[]
  onMarkupsChange: (markups: Markup[]) => void
  activeTool: MarkupType | null
  selectedMarkupId: string | null
  onMarkupSelect: (id: string | null) => void
  zoom: number
  onZoomChange: (zoom: number) => void
}
```

### ToolRail
```typescript
interface ToolRailProps {
  activeTool: MarkupType | null
  onToolSelect: (tool: MarkupType) => void
  onClear: () => void
  onExport: () => void
  onAddPDF: () => void
}
```

### MarkupsListTable
```typescript
interface MarkupsListTableProps {
  markups: Markup[]
  selectedMarkupId: string | null
  onMarkupSelect: (id: string | null) => void
  onMarkupDelete: (id: string) => void
}
```

### SidebarPanel
```typescript
interface SidebarPanelProps {
  isActive: boolean
  onClose?: () => void
  title: string
  icon: ReactNode
  children: ReactNode
}
```

## Database API Routes

### GET /api/pdf-markups
```typescript
// List markups for a PDF
GET /api/pdf-markups?pdf_file_id=uuid&page=1&limit=50

Response: Markup[]
```

### POST /api/pdf-markups
```typescript
// Create markup
POST /api/pdf-markups
{
  pdf_file_id: string
  page_number: number
  markup_type: MarkupType
  markup_data: object
}

Response: { id: string, created_at: string }
```

### PUT /api/pdf-markups/:id
```typescript
// Update markup
PUT /api/pdf-markups/markup-id
{
  markup_data: object
}

Response: { id: string, updated_at: string }
```

### DELETE /api/pdf-markups/:id
```typescript
// Delete markup
DELETE /api/pdf-markups/markup-id

Response: { deleted: boolean }
```

## Type Definitions

### Markup Types
```typescript
type MarkupType = 'select' | 'line' | 'rectangle' | 'ellipse' | 'text' | 'polyline' | 'distance' | 'area'

interface Markup {
  id: string
  type: MarkupType
  pageNumber: number
  style: MarkupStyle
  createdAt: string
  updatedAt: string
  userId: string
  author: string
  status?: 'draft' | 'completed' | 'review' | 'approved'
}

interface DrawingScale {
  pixelDistance: number
  realWorldDistance: number
  unit: string
}
```

### Collaboration Events
```typescript
interface CollaborationEvent {
  type: 'markup_created' | 'markup_updated' | 'markup_deleted' | 'comment_added' | 'user_joined' | 'user_left'
  userId: string
  userName: string
  timestamp: string
  data: any
}
```

## Error Handling

### Try-Catch Pattern
```typescript
try {
  await collaborationService.addComment(markupId, 'text')
} catch (error) {
  console.error('Failed to add comment:', error)
  // Show user-friendly error message
}
```

### Development Logging
```typescript
console.log('[v0] Debug message:', data)
```

## Performance Tips

1. **Use markupVirtualizer** to render only visible markups
2. **Cache pages** to avoid re-rendering
3. **Debounce viewport** changes to 200ms
4. **Throttle render** calls to 16ms (60fps)
5. **Monitor cache** with `getCacheStats()`
6. **Clear cache** on navigation to prevent memory leaks

## Common Patterns

### Adding a Markup with Versioning
```typescript
const newMarkup = { id: generateMarkupId(), type: 'line', ... }
dispatch({ type: 'ADD_MARKUP', payload: newMarkup })
await collaborationService.recordMarkupVersion(newMarkup.id, 'created', newMarkup)
```

### Handling Real-time Updates
```typescript
const unsubscribe = collaborationService.on('markup_created', async (event) => {
  const markup = await fetchMarkup(event.data.id)
  dispatch({ type: 'ADD_MARKUP', payload: markup })
})
```

### Batch Markup Operations
```typescript
const updatedMarkups = markups.map(m =>
  selectedMarkups.includes(m.id)
    ? { ...m, style: { ...m.style, strokeColor: '#FF0000' } }
    : m
)
dispatch({ type: 'SET_MARKUPS', payload: updatedMarkups })
```
