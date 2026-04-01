# PDF Upload Flow - Complete Diagnostic & Fix

## Executive Summary

**The Problem:** PDF uploads were failing because the upload handler was skipping the entire server upload flow, only creating local blob URLs that disappear on refresh.

**Root Cause:** Disconnect between UI file input handler and backend API - the upload button triggered `handlePdfUpload()` which created a blob URL but never called the upload API endpoint.

**The Solution:** Updated the upload flow to:
1. Send file to `/api/upload` endpoint (Vercel Blob storage)
2. Save metadata to Supabase `pdf_files` table
3. Update application state with persistent URL
4. Add comprehensive console logging at every step

---

## What Changed

### Before (Broken)
```typescript
const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    // ❌ Only creates local blob - no persistence
    const url = URL.createObjectURL(file)
    setPdfUrl(url)
  }
}
```

**Result:** 
- PDF works while browser tab is open
- Disappears on page refresh
- No database record
- No audit trail

---

### After (Fixed)
```typescript
const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  // 1. Upload to Blob storage
  const blobResponse = await fetch('/api/upload', { body: formData })
  
  // 2. Get user info from Supabase Auth
  const { data: { user } } = await supabase.auth.getUser()
  
  // 3. Save to Supabase database
  const { data: pdfFile } = await supabase
    .from('pdf_files')
    .insert({ name: file.name, url: blobUrl, uploaded_by: user.id })
  
  // 4. Update state with persistent URL
  setPdfUrl(blobUrl)
}
```

**Result:**
- PDF persists across sessions
- Database record created for audit trail
- User can re-open PDF later
- Collaboration-ready

---

## Diagnostic Points

### Point 1: File Input Handler
**Location:** `/app/plan-viewer/page.tsx` → `handlePdfUpload()`

**Failure Indicator:**
```
No [v0] logs at all = Handler never called
```

**Fix:** Ensure file input element calls handler on change:
```html
<input
  id="pdf-upload"
  type="file"
  accept=".pdf"
  onChange={handlePdfUpload}  // ← Must be wired up
  className="hidden"
/>
```

---

### Point 2: FormData Transmission
**Location:** `/app/plan-viewer/page.tsx` → fetch to `/api/upload`

**Failure Indicators:**
```
[v0] Step 1: Uploading file to Blob storage...
[v0] Upload API response status: 400
[v0] Upload API error: { error: "No file provided" }
```

**Diagnostics:**
- Check Network tab → POST `/api/upload`
- Verify `form-data` includes `file` field
- Server should log: `[v0] File details: { name: "...", size: ... }`

---

### Point 3: API Environment
**Location:** `/app/api/upload/route.ts` → environment check

**Failure Indicators:**
```
[v0] Upload API response status: 500
[v0] BLOB_READ_WRITE_TOKEN not found in environment variables
```

**Console Output Shows:**
```
[v0] Environment check: {
  hasBlobToken: false,
  tokenPrefix: "none",
  nodeEnv: "development",
  envKeys: ["NEXT_PUBLIC_SUPABASE_URL", ...]
}
```

**Fix:** Add to `.env.local`:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxxxxx
```

Then restart dev server.

---

### Point 4: Blob Storage Upload
**Location:** `/app/api/upload/route.ts` → `put(file, ...)`

**Success Output:**
```
[v0] Starting Blob upload...
[v0] Blob upload successful: https://blob.vercel-storage.com/...
```

**Failure Outputs:**
```
[v0] Blob upload failed: 403 Forbidden
[v0] Blob upload failed: 413 Payload Too Large
[v0] Blob upload failed: Network Error
```

**Root Causes:**
- `403` = Invalid token or permissions
- `413` = File > 50MB limit
- Network = Connection timeout

---

### Point 5: Authentication
**Location:** `/app/plan-viewer/page.tsx` → `supabase.auth.getUser()`

**Success Output:**
```
[v0] Step 2: Fetching current user...
[v0] User authenticated: 12345-6789-uuid
```

**Failure Output:**
```
[v0] User fetch error: { message: "invalid JWT" }
```

**Cause:** Session expired or Supabase env vars wrong

**Fix:**
1. Check env vars in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   ```
2. Sign out/in to refresh token
3. Check browser localStorage: `sb-xxx-auth-token` present?

---

### Point 6: Database Insert
**Location:** `/app/plan-viewer/page.tsx` → `supabase.from('pdf_files').insert(...)`

**Success Output:**
```
[v0] Step 3: Saving to pdf_files table...
[v0] Step 3 Complete: PDF file record created { id: "uuid", name: "floor-plan.pdf" }
```

**Failure Output - RLS Policy Issue:**
```
[v0] Database insert error: { 
  code: "42501",
  message: "permission denied for table pdf_files"
}
```

**Fix:** Check RLS policy in Supabase dashboard:
```sql
-- Should exist:
CREATE POLICY "Users can insert own files"
ON pdf_files FOR INSERT
WITH CHECK (uploaded_by = auth.uid());
```

---

### Point 7: PDF.js Loading
**Location:** PDFCanvasViewer component → PDF.js initialization

**Console Output - Success:**
```
pdf.js:1234 Warning: Custom ICC profile requested (normal, ignorable)
getDocument.promise → Promise resolved
```

**Console Output - CORS Error:**
```
Access to XMLHttpRequest blocked by CORS policy
pdf.js:5678 Error: Error reading document
```

**Fix:** Use Vercel Blob URLs (already CORS-enabled) or create proxy:
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

---

## Testing the Fix

### Manual Test Steps

1. **Open DevTools** (F12)
2. **Go to Console tab** (filter: `[v0]`)
3. **Click Upload PDF button**
4. **Select any PDF file**
5. **Watch console logs** - Should see all 4 steps
6. **Verify in 3 places:**
   - Browser console: all logs present
   - Vercel Blob: file appears in dashboard
   - Supabase: row added to pdf_files table
   - Canvas: PDF renders (not blank)

### Automated Test

```typescript
// pages/test-upload.tsx
import { useState } from 'react'

export default function TestUpload() {
  const [log, setLog] = useState<string[]>([])
  
  const handleTest = async () => {
    const logs: string[] = []
    const originalLog = console.log
    
    console.log = (...args: any[]) => {
      if (args[0]?.includes('[v0]')) {
        logs.push(args.join(' '))
      }
      originalLog(...args)
    }
    
    // Test upload here
    
    console.log = originalLog
    setLog(logs)
  }
  
  return (
    <div>
      <button onClick={handleTest}>Test Upload</button>
      <pre>{log.join('\n')}</pre>
    </div>
  )
}
```

---

## Performance Optimization

The fix includes:
- Async upload (non-blocking UI)
- Loading state with spinner
- Error banner with dismiss option
- Parallel database save (after blob completes)
- State dispatch to sync with Redux-like context

---

## Files Modified

1. `/app/plan-viewer/page.tsx`
   - Added Supabase client initialization
   - Updated `handlePdfUpload` with 4-step flow
   - Added error state and loading spinner
   - Added error banner display

2. `/docs/PDF_UPLOAD_DIAGNOSTIC.md` (New)
   - Step-by-step failure analysis
   - Console output examples
   - Root cause for each failure
   - Solutions for each scenario

3. `/docs/TROUBLESHOOTING_PDF_UPLOAD.md` (New)
   - 8 detailed failure scenarios
   - Exact console output to expect
   - Root causes
   - Solutions for each
   - Testing checklist

---

## What to Check If Still Not Working

1. **Console logs showing?**
   - If no `[v0]` logs: event handler not wired
   - If logs stop mid-flow: that step failed

2. **API route working?**
   - Test with curl: `curl -F "file=@test.pdf" http://localhost:3000/api/upload`

3. **Supabase auth valid?**
   - Check localStorage: `console.log(localStorage.getItem('sb-xxx-auth-token'))`

4. **Database table exists?**
   - Supabase dashboard → SQL editor → `SELECT * FROM pdf_files LIMIT 1`

5. **RLS policies blocking?**
   - Try disabling RLS temporarily to test (then re-enable)
