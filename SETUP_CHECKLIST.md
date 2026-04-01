# PDF Viewer - Setup & Verification Checklist

## Pre-Setup

- [ ] Node.js 16+ installed
- [ ] `pdfjs-dist` already in package.json (installed)
- [ ] Next.js project is running
- [ ] Can access `http://localhost:3000`

## Setup Steps

### Step 1: Copy Worker File
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
```

Verify:
```bash
ls -la public/pdf.worker.min.js
```

Expected: File exists and is ~140KB

### Step 2: Component Ready
- [ ] `/components/pdf-viewer/PDFCanvasViewer.tsx` exists (454 lines)
- [ ] `/lib/pdf-viewer-types.ts` exists (types defined)
- [ ] `/app/pdf-viewer-example/page.tsx` exists (example page)

### Step 3: Test Example Page
- [ ] Open `http://localhost:3000/pdf-viewer-example`
- [ ] Click "Upload PDF"
- [ ] Select any PDF file from your computer
- [ ] Observe upload progress
- [ ] PDF renders in viewer

### Step 4: Verify Logging
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Upload should show:
  ```
  [v0] Example: Starting PDF upload - filename.pdf (X KB)
  [v0] Example: Upload successful - https://...
  [v0] PDF.js: Worker configured...
  [v0] PDF Load: START - Loading PDF from URL...
  [v0] PDF Load: SUCCESS - PDF loaded with X pages
  [v0] PDF Render: Page rendered successfully
  ```

### Step 5: Test Markup
- [ ] Click "Add Red Rectangle Markup" button
- [ ] Red rectangle appears on PDF
- [ ] Markup counter shows "1" at bottom

### Step 6: Test Navigation
- [ ] Click "→" (next page) if PDF has multiple pages
- [ ] Page number changes
- [ ] PDF re-renders for new page

### Step 7: Test Zoom
- [ ] Click "+" to zoom in
- [ ] Zoom percentage increases
- [ ] PDF zooms smoothly
- [ ] Click "-" to zoom out

## Integration Steps

When using in your app:

### Step 1: Import Component
```typescript
import { PDFCanvasViewer } from '@/components/pdf-viewer/PDFCanvasViewer'
```

### Step 2: Create State
```typescript
const [pdfUrl, setPdfUrl] = useState('')
const [markups, setMarkups] = useState<Markup[]>([])
```

### Step 3: Upload Handler
```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload-pdf', { method: 'POST', body: formData })
  const { url } = await res.json()
  setPdfUrl(url)  // Component auto-renders
}
```

### Step 4: Use Component
```typescript
<PDFCanvasViewer
  pdfUrl={pdfUrl}
  markups={markups}
  onPdfLoaded={(pages) => console.log('Loaded', pages)}
  onError={(err) => alert('Error: ' + err)}
/>
```

## Upload API Setup

Create `/api/upload-pdf/route.ts`:

```typescript
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  
  const blob = await put(file.name, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}
```

## Troubleshooting

### Issue: No console logs
- [ ] Refresh page (F5)
- [ ] Check if DevTools console is open
- [ ] Look for `[v0]` prefix

### Issue: "Awaiting PDF parse completion..." then stops
- [ ] Check worker file exists: `ls -la public/pdf.worker.min.js`
- [ ] File size should be ~140KB
- [ ] If missing, copy it: `cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/`
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check Network tab (F12) for 404 on `pdf.worker.min.js`

### Issue: Canvas blank but logs say "SUCCESS"
- [ ] Check CSS - canvas should have size
- [ ] Check browser console for render errors
- [ ] Try with a different PDF file

### Issue: Can't find pdfjs-dist
- [ ] Verify installed: `npm list pdfjs-dist`
- [ ] If missing: `npm install pdfjs-dist`

## Performance Verification

- [ ] PDF loads in < 2 seconds
- [ ] Zoom is smooth (60fps)
- [ ] No memory warnings in console
- [ ] Markup drawing is instant
- [ ] Page navigation is responsive

## Security Verification

- [ ] Worker loaded from local file (not CDN)
- [ ] No external requests for PDF.js resources
- [ ] PDF URL is CORS-accessible
- [ ] No errors in Network tab

## Documentation

- [ ] Read `/docs/PDF_VIEWER_QUICK_REFERENCE.md` (fast)
- [ ] Read `/docs/PDF_VIEWER_SETUP.md` (comprehensive)
- [ ] Read `/docs/IMPLEMENTATION_SUMMARY.md` (architecture)

## Production Checklist

Before deploying:

- [ ] Worker file included in deployment
- [ ] `NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN` set (if using Vercel Blob)
- [ ] Tested with real PDFs
- [ ] Error handling works
- [ ] Console logs don't spam (only on dev)
- [ ] Markups persist (if using database)
- [ ] Performance acceptable for your PDFs

## Common Modifications

### Remove Console Logs
Find and remove all `console.log('[v0]...` lines if deploying.

### Custom Styling
Modify canvas container and toolbar styling in component.

### Different Zoom Range
Change `Math.max(0.5, ...)` and `Math.min(3, ...)` values.

### Add More Markup Types
Add new `case` statements in `drawMarkupsOnCanvas()` function.

### Database Integration
Pass `onPdfLoaded` and `onError` callbacks to your save/load logic.

## Support

If something doesn't work:

1. Check console (F12) for `[v0]` logs
2. Verify worker file: `ls -la public/pdf.worker.min.js`
3. Try the example page first: `/pdf-viewer-example`
4. Check browser support (Chrome 60+, Firefox 55+, Safari 11+, Edge 79+)
5. Review `/docs/PDF_VIEWER_SETUP.md` troubleshooting section

---

**All tests passing? You're ready to use the PDF viewer!** ✅
