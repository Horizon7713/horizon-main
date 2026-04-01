// CRITICAL: PDF Viewer Setup Guide

## The Problem (From Debug Logs)

Your debug logs show:
```
[v0] PDF Load: Creating blob URL for PDF.js loading...
[v0] PDF Load: Blob URL created: blob:https://...
[v0] PDF Load: Creating PDF.js document with blob URL...
[v0] PDF Load: getDocument() called with blob URL...
[v0] PDF Load: Awaiting PDF parse completion...
```

Then **nothing**. The promise never resolves because **PDF.js cannot find the worker file**.

## The Solution

PDF.js requires a worker file to parse PDFs. Without it, `getDocument().promise` hangs forever.

### Step 1: Copy the Worker File (REQUIRED)

```bash
# Copy the official worker from node_modules to public folder
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
```

Verify it was copied:
```bash
ls -la public/pdf.worker.min.js
```

### Step 2: Hard Refresh Browser Cache

After copying the file, hard refresh your browser:
- **Chrome/Edge**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- **Firefox**: `Ctrl + Shift + F5` (Windows) or `Cmd + Shift + R` (Mac)
- **Safari**: `Cmd + Option + R` (Mac)

### Step 3: Upload a PDF and Check Logs

1. Upload a PDF through your app
2. Open DevTools (F12)
3. Look for these logs:
   ```
   [v0] PDF Load: SUCCESS - PDF loaded with X pages
   [v0] PDF Render: Page 1 rendered successfully
   ```

If you see "SUCCESS", it's working!

## How It Works

1. **Worker Configuration**: Component sets `pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'`
2. **PDF Fetch**: Fetches PDF from blob URL as arrayBuffer
3. **Blob URL Creation**: Creates a local blob: URL so PDF.js can access data without CORS issues
4. **getDocument()**: Passes blob URL to PDF.js, which uses the worker to parse it
5. **Canvas Render**: Once promise resolves, renders page to canvas
6. **Markup Drawing**: Draws any markups on top of rendered page
7. **Cleanup**: Revokes blob URL on unmount to prevent memory leaks

## Debug Checklist

### If logs stop at "Awaiting PDF parse completion..."

1. **Check worker file exists**:
   ```bash
   ls -la public/pdf.worker.min.js
   ```
   If missing, copy it: `cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js`

2. **Check Network tab** (F12 → Network):
   - Should see request for `/pdf.worker.min.js`
   - Status should be 200, NOT 404
   - If 404, the file isn't in the right location

3. **Hard refresh browser**:
   - `Ctrl + Shift + R` to clear cache completely

4. **Check console for errors**:
   - Should NOT see "Worker failed to initialize"
   - Should see `[v0] PDF Load: Worker is configured`

### If canvas is blank

1. Check browser console for render errors
2. Verify canvas has size (not hidden by CSS)
3. Check "PDF Render" logs to confirm rendering started

### If you see CORS errors

- Use blob URLs (done automatically)
- Or use Vercel Blob URLs with public access

## Component Props

```typescript
interface PDFViewerProps {
  pdfUrl: string              // URL to PDF (blob or HTTP)
  markups?: Markup[]          // Markups to draw
  onPdfLoaded?: (numPages: number) => void  // Called when ready
  onError?: (error: string) => void         // Called on error
}
```

## Example Usage

```typescript
import { PDFViewerWithMarkup } from '@/components/pdf-viewer/PDFViewerWithMarkup'

export default function MyPage() {
  const [pdfUrl, setPdfUrl] = useState('')
  const [markups, setMarkups] = useState([])

  return (
    <PDFViewerWithMarkup
      pdfUrl={pdfUrl}
      markups={markups}
      onPdfLoaded={(pages) => console.log('Loaded', pages, 'pages')}
      onError={(err) => alert('Error: ' + err)}
    />
  )
}
```

## Markup Types Supported

### 1. Line
```typescript
{
  type: 'line',
  startPoint: { x: 100, y: 100 },
  endPoint: { x: 200, y: 200 }
}
```

### 2. Rectangle
```typescript
{
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 150
}
```

### 3. Ellipse
```typescript
{
  type: 'ellipse',
  cx: 150,
  cy: 150,
  rx: 100,
  ry: 75,
  rotation: 0
}
```

### 4. Polyline
```typescript
{
  type: 'polyline',
  points: [{ x: 100, y: 100 }, { x: 150, y: 150 }],
  closed: false
}
```

### 5. Distance
```typescript
{
  type: 'distance',
  startPoint: { x: 100, y: 100 },
  endPoint: { x: 200, y: 200 },
  pixelDistance: 141.42,
  measuredDistance: 10,
  unit: 'ft'
}
```

### 6. Area
```typescript
{
  type: 'area',
  points: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }],
  pixelArea: 10000,
  measuredArea: 100,
  unit: 'sq ft'
}
```

### 7. Text
```typescript
{
  type: 'text',
  x: 100,
  y: 100,
  text: 'Important Note',
  style: { fontSize: 14, fontFamily: 'Arial' }
}
```

## Console Logging

The component logs every stage with `[v0]` prefix:

- `[v0] PDF Load: START` - Starting to load
- `[v0] PDF Load: Worker is configured` - Worker ready
- `[v0] PDF Load: Fetching PDF from URL...` - Fetching
- `[v0] PDF Load: PDF fetched successfully - X bytes` - Fetch complete
- `[v0] PDF Load: PDF signature check - VALID` - Valid PDF
- `[v0] PDF Load: Creating blob URL...` - Creating blob
- `[v0] PDF Load: getDocument() called...` - Calling PDF.js
- `[v0] PDF Load: Awaiting PDF parse completion...` - Parsing (should resolve)
- `[v0] PDF Load: SUCCESS - PDF loaded with X pages` - Done!
- `[v0] PDF Render: Page X rendered successfully` - Rendering done
- `[v0] PDF Render: Drawing X markups` - Drawing markups

## Files Needed

1. `/components/pdf-viewer/PDFViewerWithMarkup.tsx` - Main component (provided)
2. `/lib/pdf-viewer-types.ts` - Types (already exists)
3. `public/pdf.worker.min.js` - Worker file (copy from node_modules)

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Promise never resolves | Worker file not found | Copy file: `cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js` |
| 404 on worker.min.js | File in wrong location | Check file is in `/public` folder, not `/public/pdf` |
| Canvas blank | Rendering failed | Check console for render errors, verify canvas has size |
| CORS error | External PDF blocked | Use blob URLs or Vercel Blob with public access |
| High memory usage | Blob URLs not cleaned | Component auto-cleanup on unmount, just mount/unmount properly |

## Next Steps

1. ✅ Copy worker file
2. ✅ Hard refresh browser
3. ✅ Test with your PDF
4. ✅ Check console logs
5. Build drawing tools (optional)
6. Add markup saving (optional)
7. Add collaboration (optional)

**Once you copy the worker file and hard refresh, the component will work!**
