# PDF.js Worker Setup Guide

## The Core Issue

PDF.js requires a worker to handle document parsing and rendering. The worker operates in a separate thread and communicates with the main thread via message passing. When the worker isn't properly initialized, `getDocument().promise` never resolves.

## Solution: Two Approaches

### Approach 1: Copy Official Worker File (RECOMMENDED)

This is the most reliable method:

1. **Get the worker file from pdfjs-dist**:
   - After installing `pdfjs-dist`, locate `node_modules/pdfjs-dist/build/pdf.worker.min.js`
   
2. **Copy it to your public folder**:
   ```bash
   cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
   ```

3. **The PDFCanvasViewer component will automatically find it** at `/pdf.worker.min.js`

### Approach 2: Use the Inline Worker Fallback

If you can't copy the file to public/, the component has a fallback inline worker that works in most cases.

## Implementation

Replace your current PDF viewer component with the working version in `PDFCanvasViewer-WORKING.tsx`:

```bash
# Backup your current version
mv components/pdf-viewer/pdf-canvas-viewer.tsx components/pdf-viewer/pdf-canvas-viewer.backup.tsx

# Use the working version
cp components/pdf-viewer/PDFCanvasViewer-WORKING.tsx components/pdf-viewer/pdf-canvas-viewer.tsx
```

## Key Differences

| Aspect | Old | New |
|--------|-----|-----|
| Worker Init | Multiple fallbacks, complex | Clean: first tries `/public`, then inline |
| PDF Loading | Uint8Array + blob URL | Direct blob URL only |
| Error Handling | Minimal | Comprehensive with logging |
| Abort Support | None | AbortController for cleanup |
| Stream Handling | `disableStream: true` + options | Simpler config without cMapUrl |

## Testing

1. Upload a PDF from the blob storage
2. Check console logs:
   - `[v0] PDF.js: Worker path set to /pdf.worker.min.js` = Worker found
   - `[v0] PDF.js: Fallback inline worker initialized` = Using fallback
   - `[v0] PDF Load: Document loaded successfully - X pages` = PDF loaded
   - `[v0] PDF Render: Page 1 rendered successfully` = Canvas rendering working

3. The PDF should appear on the canvas with navigation controls

## Troubleshooting

**Issue**: Canvas never renders, logs stop at "Awaiting document promise..."
- **Cause**: Worker not initialized properly
- **Fix**: Ensure `/pdf.worker.min.js` is in your `public/` folder, OR check browser console for worker errors

**Issue**: Markups don't appear
- **Cause**: `drawMarkup` utility might have issues with pan values
- **Fix**: Check `lib/pdf-markup-utils.ts` - the working component passes `0, 0` for pan instead of calculated values

**Issue**: PDF loads but canvas is blank
- **Cause**: Canvas context not clearing properly, or rendering happening off-canvas
- **Fix**: Check browser DevTools - inspect the canvas element size and position

## Production Deployment

For production, ensure:
1. `public/pdf.worker.min.js` is committed to your repository
2. It's served correctly by your build system (Vercel, etc.)
3. Add to `.gitignore` if you prefer to download it during build:
   ```bash
   public/pdf.worker.min.js
   ```
   Then add a build script to download it.

## Next Steps

After the PDF renders successfully:
1. Test markup tools (line, rectangle, ellipse, etc.)
2. Verify zoom and pan controls work
3. Test page navigation
4. Verify markups persist and render correctly
