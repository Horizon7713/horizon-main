<!-- PDF Viewer Installation & Configuration Guide -->

# PDF Viewer Installation Guide

## Prerequisites

Ensure you have `pdfjs-dist` installed:

```bash
npm install pdfjs-dist
```

## Critical Step: Copy the Worker File

**This is the most important step. Without it, PDFs won't render.**

### Option 1: Using the Setup Script

```bash
bash scripts/setup-pdf-worker.sh
```

### Option 2: Manual Copy

```bash
# Copy the worker file from node_modules to public folder
mkdir -p public
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
```

### Option 3: Add to package.json

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "postinstall": "cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js || true",
    "dev": "next dev",
    "build": "next build && cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js"
  }
}
```

Then run:
```bash
npm run postinstall
npm run dev
```

## Verify Installation

Check that the worker file exists:

```bash
ls -la public/pdf.worker.min.js
```

You should see:
```
-rw-r--r--  public/pdf.worker.min.js (around 320KB)
```

## Component Usage

### Basic Example

```typescript
'use client'

import { useState } from 'react'
import { PDFCanvasViewer } from '@/components/pdf-viewer/PDFCanvasViewer'

export default function MyViewer() {
  const [pdfUrl, setPdfUrl] = useState('')

  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    setPdfUrl(url)
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file)
        }}
      />

      {pdfUrl && (
        <PDFCanvasViewer
          pdfUrl={pdfUrl}
          onPdfLoaded={(pages) => console.log('PDF loaded:', pages, 'pages')}
          onError={(error) => console.error('Error:', error)}
        />
      )}
    </div>
  )
}
```

### With Markups

```typescript
import { PDFCanvasViewer } from '@/components/pdf-viewer/PDFCanvasViewer'
import type { Markup } from '@/lib/pdf-viewer-types'

export default function ViewerWithMarkups() {
  const [markups, setMarkups] = useState<Markup[]>([])

  const addRectangleMarkup = () => {
    const markup: Markup = {
      id: 'markup-' + Date.now(),
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
      userId: 'user123',
      author: 'John Doe',
    }
    setMarkups([...markups, markup])
  }

  return (
    <div>
      <button onClick={addRectangleMarkup}>Add Rectangle</button>
      <PDFCanvasViewer
        pdfUrl={pdfUrl}
        markups={markups}
        onPdfLoaded={handlePdfLoaded}
        onError={handleError}
      />
    </div>
  )
}
```

### With Vercel Blob Storage

```typescript
import { put } from '@vercel/blob'
import { PDFCanvasViewer } from '@/components/pdf-viewer/PDFCanvasViewer'

export default function BlobStorageViewer() {
  const [pdfUrl, setPdfUrl] = useState('')

  const handleUploadToBlob = async (file: File) => {
    console.log('[Upload] Uploading to Vercel Blob...')
    
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    console.log('[Upload] Upload complete:', blob.url)
    setPdfUrl(blob.url)
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUploadToBlob(file)
        }}
      />

      {pdfUrl && <PDFCanvasViewer pdfUrl={pdfUrl} />}
    </div>
  )
}
```

## Testing

### Test Page

Visit `/pdf-viewer-example` to see a working example:

```
http://localhost:3000/pdf-viewer-example
```

This page includes:
- File upload input
- PDF viewer component
- Test markup generation
- Debug logging display

### Test With Sample PDF

1. Download a sample PDF or use any PDF on your computer
2. Upload via the example page
3. Check browser console for logs
4. Verify first page renders
5. Test zoom and page navigation
6. Add test markups

## Common Issues

### Worker File Not Found

**Error:** "Failed to initialize PDF.js" or promise never resolves

**Fix:**
```bash
# Verify file exists
ls -la public/pdf.worker.min.js

# If missing, copy it
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
```

### Canvas Blank After Load

**Cause:** File is too large or rendering failed silently

**Check console logs:**
- Look for `[v0] PDF Render: Page rendered successfully`
- Check for any JavaScript errors
- Try a different/smaller PDF file

### CORS Errors

**Use blob URLs for local files:**
```typescript
const url = URL.createObjectURL(file)
setPdfUrl(url)
```

**For remote URLs, ensure they're CORS-enabled:**
- Use Vercel Blob (CORS-enabled)
- Configure your server to allow CORS
- Use public CDN URLs

## Performance Optimization

### For Large PDFs (100+ pages)

```typescript
<PDFCanvasViewer
  pdfUrl={pdfUrl}
  markups={markups.filter(m => m.pageNumber === currentPage)}
  // Only pass markups for current page to reduce render time
/>
```

### For Many Markups (1000+)

```typescript
const visibleMarkups = markups.filter(m => 
  m.pageNumber === currentPage && 
  isMarkupInViewport(m, zoom, pan)
)

<PDFCanvasViewer
  pdfUrl={pdfUrl}
  markups={visibleMarkups}
/>
```

## Debugging

Enable detailed logging:

```typescript
// All logs start with [v0] and are printed to console
// Check console to see:
// - Worker initialization
// - PDF fetch progress
// - Parsing status
// - Rendering steps
// - Markup drawing

// Look for patterns like:
// [v0] PDF Load: SUCCESS - PDF loaded with X pages
// [v0] PDF Render: Page rendered successfully
```

## Production Deployment

### Vercel

The component works out-of-the-box on Vercel:

```bash
git push
# Vercel automatically runs build and copies worker file via npm postinstall
```

### Self-Hosted

Ensure build includes worker file:

```bash
# In your build script
npm install
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
npm run build
```

### Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install && \
    cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Next Steps

1. ✅ Install pdfjs-dist
2. ✅ Copy worker file to public folder
3. ✅ Test with example page
4. ✅ Integrate into your application
5. ⬜ Add markup drawing tools
6. ⬜ Implement server-side save/load
7. ⬜ Add real-time collaboration features

## Support

For issues or questions:

1. Check `/docs/PDF_VIEWER_SETUP.md` for detailed documentation
2. Review browser console logs (search for `[v0]`)
3. Test with the example page
4. Verify worker file exists in public folder
5. Try with a different PDF file

## Files Created

- `/components/pdf-viewer/PDFCanvasViewer.tsx` - Main component
- `/lib/pdf-viewer-types.ts` - TypeScript types
- `/app/pdf-viewer-example/page.tsx` - Example usage
- `/docs/PDF_VIEWER_SETUP.md` - Detailed documentation
- `/scripts/setup-pdf-worker.sh` - Setup script
