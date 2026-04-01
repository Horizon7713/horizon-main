# PDF Viewer Quick Reference

## Installation (Copy & Paste)

```bash
# 1. Copy worker file
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js

# 2. Done! Component auto-configures
```

## Basic Usage

```typescript
import { PDFCanvasViewer } from '@/components/pdf-viewer/PDFCanvasViewer'

function MyPage() {
  const [pdfUrl, setPdfUrl] = useState('')
  
  return (
    <PDFCanvasViewer
      pdfUrl={pdfUrl}
      markups={[]}
      onPdfLoaded={(pages) => console.log(pages)}
      onError={(err) => console.error(err)}
    />
  )
}
```

## File Upload

```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const res = await fetch('/api/upload-pdf', {
    method: 'POST',
    body: formData,
  })
  
  const { url } = await res.json()
  setPdfUrl(url)  // Component renders immediately
}
```

## Add Markups

```typescript
const markups = [
  {
    id: 'mark-1',
    type: 'rectangle',
    pageNumber: 1,
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    style: {
      strokeColor: '#FF0000',
      strokeWidth: 2,
      fillColor: 'rgba(255, 0, 0, 0.1)',
      opacity: 0.8,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-id',
    author: 'John Doe',
  },
]

<PDFCanvasViewer pdfUrl={pdfUrl} markups={markups} />
```

## Debug: Check Logs (Open F12)

```
[v0] PDF.js: Worker configured...
[v0] PDF Load: Fetching PDF...
[v0] PDF Load: SUCCESS - PDF loaded with 10 pages
[v0] PDF Render: Page rendered successfully
```

## If Promise Hangs

```bash
# 1. Check worker file exists
ls -la public/pdf.worker.min.js

# 2. If missing, copy it
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/

# 3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
```

## Markup Types

| Type | Properties |
|------|-----------|
| `line` | `startPoint`, `endPoint` |
| `rectangle` | `x`, `y`, `width`, `height` |
| `ellipse` | `cx`, `cy`, `rx`, `ry` |
| `polyline` | `points[]`, `closed` |
| `distance` | `startPoint`, `endPoint`, `pixelDistance` |
| `area` | `points[]`, `pixelArea` |
| `text` | `text`, `x`, `y` |

## Example: Add Red Rectangle

```typescript
const markup = {
  id: Date.now().toString(),
  type: 'rectangle',
  pageNumber: 1,
  x: 50,
  y: 50,
  width: 300,
  height: 200,
  style: {
    strokeColor: '#FF0000',
    strokeWidth: 2,
    fillColor: 'rgba(255, 0, 0, 0.1)',
    opacity: 0.8,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'current-user',
  author: 'User Name',
}

setMarkups(prev => [...prev, markup])
```

## Component Props

```typescript
interface PDFCanvasViewerProps {
  pdfUrl: string                        // Required: URL to PDF
  markups?: Markup[]                    // Optional: Markups to draw
  onPdfLoaded?: (pages: number) => void // Optional: PDF loaded callback
  onError?: (error: string) => void     // Optional: Error callback
}
```

## Upload API Example

```typescript
// /api/upload-pdf/route.ts
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  const blob = await put(file.name, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}
```

## Testing

1. Go to `http://localhost:3000/pdf-viewer-example`
2. Upload a PDF
3. Check console (F12) for `[v0]` logs
4. Click "Add Red Rectangle Markup" to test
5. Verify PDF renders and markup appears

## Production Checklist

- [ ] Worker file copied to `/public/pdf.worker.min.js`
- [ ] Component renders PDFs from Vercel Blob URLs
- [ ] Markups draw correctly on pages
- [ ] Zoom (0.5x - 3x) works smoothly
- [ ] Page navigation works (prev/next buttons)
- [ ] No errors in console
- [ ] Memory doesn't leak on new PDFs
- [ ] PDF URLs are public/accessible
- [ ] Error handling works (invalid PDF, network error, etc.)

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Awaiting completion" then stops | Copy worker: `cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/` |
| Canvas blank | Check console errors, verify PDF is valid |
| Markups not showing | Check `pageNumber` matches current page, verify `style` properties |
| Memory leak | Only one viewer instance, check component mounts correctly |
| CORS errors | Use public Blob URLs or blob: URLs from File objects |

## Files

- `/components/pdf-viewer/PDFCanvasViewer.tsx` - Main component
- `/app/pdf-viewer-example/page.tsx` - Working example
- `/lib/pdf-viewer-types.ts` - Types (already created)
- `/docs/PDF_VIEWER_SETUP.md` - Full setup guide

## Next: Building Features

After getting this working, you can build:

1. **Drawing Tools** - Create markups with mouse
2. **Properties Panel** - Edit markup styles
3. **Markups List** - Show all markups, filter/search
4. **Database Sync** - Save/load from Supabase
5. **Collaboration** - Real-time updates with Supabase Realtime
6. **Undo/Redo** - History management

---

Need help? Check `/docs/PDF_VIEWER_SETUP.md` for detailed troubleshooting.
