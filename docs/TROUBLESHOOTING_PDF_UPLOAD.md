# PDF Upload Troubleshooting Guide

## Quick Diagnosis: Browser Console Check

Open DevTools (F12) → Console tab and look for `[v0]` logs. The sequence tells you exactly where it fails:

### Success Sequence:
```
[v0] Upload started: { name: "floor-plan.pdf", size: 2458634, type: "application/pdf", sizeInMB: "2.34" }
[v0] Step 1: Uploading file to Blob storage...
[v0] Upload API response status: 200
[v0] Step 1 Complete: File uploaded to Blob { url: "https://blob.vercel-storage.com/...", filename: "..." }
[v0] Step 2: Fetching current user...
[v0] User authenticated: 12345-uuid
[v0] Step 3: Saving to pdf_files table...
[v0] Step 3 Complete: PDF file record created { id: "uuid", name: "floor-plan.pdf" }
[v0] Step 4: Updating application state...
[v0] Upload complete - all steps successful
[v0] PDF ready for markup at: https://blob.vercel-storage.com/...
```

---

## Failure Scenarios

### FAILURE 1: Upload Hangs After "Step 1: Uploading file to Blob storage..."

**What You See:**
- Loading spinner for 30+ seconds
- "Step 1" log appears but nothing after
- No response from API

**Causes:**
1. API route not reachable (server down)
2. Network connectivity issue
3. File being processed (legitimate but slow)

**Browser Console:**
```
[v0] Step 1: Uploading file to Blob storage...
(nothing for 30+ seconds)
```

**Fix:**
1. Check server is running: `yarn dev` or deployment status
2. Check network tab in DevTools - see if request appears
3. Increase file upload timeout
4. Try smaller file (< 5MB) for testing

---

### FAILURE 2: "Upload API response status: 400"

**What You See:**
- Error banner appears: "Upload Error: No file provided"
- Upload button returns to normal

**Browser Console:**
```
[v0] Step 1: Uploading file to Blob storage...
[v0] Upload API response status: 400
[v0] Upload API error: { error: "No file provided" }
```

**Root Cause:** FormData not properly formatted

**Fix:** Verify file is being read correctly:
```typescript
const file = e.target.files?.[0]
console.log('[v0] File exists:', !!file)
console.log('[v0] File type:', file?.type)
console.log('[v0] File size:', file?.size)
```

---

### FAILURE 3: "File too large: 54MB"

**What You See:**
- Error banner: "Upload Error: File too large"
- File rejected immediately

**Browser Console:**
```
[v0] Upload API response status: 413
[v0] Upload API error: { 
  error: "File too large",
  details: "File size (54.32MB) exceeds maximum allowed size (50MB)"
}
```

**Fix:**
1. Use smaller PDF (split large files)
2. Increase MAX_FILE_SIZE in `/app/api/upload/route.ts`:
   ```typescript
   const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
   ```

---

### FAILURE 4: "BLOB_READ_WRITE_TOKEN not found"

**What You See:**
- Error banner: "Upload Error: Blob storage not configured"
- Disappears immediately after file selection

**Browser Console:**
```
[v0] Upload API response status: 500
[v0] Upload API error: {
  error: "Blob storage not configured"
}
```

**Server Console (Next.js terminal):**
```
[v0] Environment check: { hasBlobToken: false, ... }
[v0] BLOB_READ_WRITE_TOKEN not found in environment variables
[v0] Available env keys: NEXT_PUBLIC_SUPABASE_URL, ...
```

**Root Cause:** Environment variable not set

**Fix:**
1. Check `.env.local` has `BLOB_READ_WRITE_TOKEN`:
   ```
   BLOB_READ_WRITE_TOKEN=vercel_blob_xxx...
   ```
2. Restart dev server after adding env var
3. For production, set in Vercel dashboard → Settings → Environment Variables

---

### FAILURE 5: "User fetch error: invalid JWT"

**What You See:**
- Error banner: "Upload Error: Not authenticated"
- Everything uploaded correctly but auth fails

**Browser Console:**
```
[v0] Step 1 Complete: File uploaded to Blob
[v0] Step 2: Fetching current user...
[v0] User fetch error: { message: "invalid JWT" }
```

**Root Cause:** Session expired or invalid

**Fix:**
1. Check Supabase env vars are set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   ```
2. Sign out and sign back in to refresh token
3. Check browser localStorage - `sb-xxx-auth-token` should exist

---

### FAILURE 6: "Database insert error: permission denied"

**What You See:**
- Upload completes to Blob successfully
- Error banner: "Upload Error: Database error: permission denied"

**Browser Console:**
```
[v0] Step 3: Saving to pdf_files table...
[v0] Database insert error: {
  code: "42501",
  message: "permission denied for table pdf_files",
  hint: "..."
}
```

**Root Cause:** Row-Level Security (RLS) policy blocking insert

**Fix:**
1. Check RLS policies on pdf_files table in Supabase
2. Verify current user ID is being passed correctly:
   ```
   user.id = 12345-uuid (from auth.getUser())
   ```
3. Policy should allow users to insert their own records:
   ```sql
   CREATE POLICY "Users can insert own files"
   ON pdf_files FOR INSERT
   WITH CHECK (uploaded_by = auth.uid());
   ```

---

### FAILURE 7: PDF Loads But Shows Blank Canvas

**What You See:**
- No error messages
- PDF.js console warning appears
- Canvas is blank/white

**Browser Console:**
```
[v0] Upload complete - all steps successful
[v0] PDF ready for markup at: https://blob.vercel-storage.com/xxx.pdf
pdf.js:1234 Warning: Custom ICC profile requested (IGNORABLE)
pdf.js:5678 Error: Error reading document
```

**Root Cause:** PDF.js can't load from URL (CORS, format, or corruption)

**Fixes:**
1. Verify URL returns PDF:
   ```
   curl -I https://blob.vercel-storage.com/xxx.pdf
   > Content-Type: application/pdf ✓
   > Content-Length: 2458634 ✓
   ```
2. Check for CORS issues:
   ```
   // If error says "CORS policy blocked"
   // Use /api/pdf-proxy instead
   ```
3. Test with different PDF:
   - Upload a known-good PDF to verify flow
   - If it works, original PDF may be corrupted

---

### FAILURE 8: "Access to XMLHttpRequest blocked by CORS"

**What You See:**
- PDF doesn't load
- Canvas shows blank
- Browser blocks the request

**Browser Console (Network tab):**
```
Access to XMLHttpRequest at 'https://...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Root Cause:** Loading PDF from different origin without CORS headers

**Fix - Option 1:** Use Blob storage (already has CORS):
```typescript
// ✅ This works fine
const blobUrl = await uploadToBlobStorage()
setPdfUrl(blobUrl)
```

**Fix - Option 2:** Create PDF proxy route:
```typescript
// /app/api/pdf-proxy/route.ts
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const response = await fetch(url!)
  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
```

Then use:
```typescript
setPdfUrl(`/api/pdf-proxy?url=${encodeURIComponent(blobUrl)}`)
```

---

## Performance Issues

### PDF Takes 30+ Seconds to Load

**Cause:** Large PDF being rendered all at once

**Check in Browser Console:**
```
pdf.js:1234 Rendering page 1 of 450 (425 more pages)
(hangs for 30 seconds)
```

**Solution - Enable PDF page caching:**
```typescript
// In pdf-performance-manager.ts
const performanceManager = new PDFPerformanceManager({
  maxCacheSize: 20, // Cache 20 pages instead of 10
  virtualizePages: true, // Only render visible pages
  preloadDistance: 3, // Preload ±3 pages
})
```

### Markups Don't Appear on PDF

**Check:**
1. PDF loaded successfully (no errors above)
2. Drawing tool is active (not "Select")
3. Markups table shows markups (count > 0)
4. Canvas has focus (click on it first)

**Test:**
```
1. Open DevTools
2. Draw a line on the PDF
3. Check console for:
   - No errors
   - Markup added to state
   - Canvas redraws with line
```

---

## Testing Checklist

- [ ] Console shows all [v0] steps in sequence
- [ ] No error messages
- [ ] File appears in Vercel Blob dashboard
- [ ] PDF displays in canvas (not blank)
- [ ] Can draw markups
- [ ] Markups persist on refresh
- [ ] Multiple files can be uploaded
- [ ] Users can see each other's markups (collaboration)

---

## Getting Help

If stuck, collect this info:

1. **Browser Console Output:**
   ```
   Paste ALL [v0] logs here
   ```

2. **Network Tab:**
   - Expand POST `/api/upload` request
   - Show Response and Headers

3. **Supabase:**
   - Check pdf_files table has new row
   - Check RLS policies in Settings

4. **Environment:**
   ```
   echo "BLOB token set: $BLOB_READ_WRITE_TOKEN" (shouldn't show token, just ✓/✗)
   echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
   ```
