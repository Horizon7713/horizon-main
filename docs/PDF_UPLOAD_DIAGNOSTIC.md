# PDF Upload Diagnostic Guide

## Current Architecture Issues

### PRIMARY ISSUE: Upload Flow Disconnect
The plan-viewer page has a **disconnect** between the UI and the backend:

1. **File Input Handler** (plan-viewer/page.tsx:line ~210)
   ```typescript
   const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (file) {
       const url = URL.createObjectURL(file)  // ❌ PROBLEM: Using blob URL only
       setPdfUrl(url)
       // Never calls the upload API
     }
   }
   ```
   
   **What happens:** Only creates a browser blob URL, doesn't persist to Supabase.

2. **Blob Storage Upload Route** (app/api/upload/route.ts)
   ```typescript
   // Uses Vercel Blob, not Supabase Storage
   // Has proper error logging but is NEVER CALLED
   ```
   
   **What happens:** Has great console logs but upload API never triggered.

---

## Step-by-Step Failure Points

### Step 1: File Input Handler
**Current Code:**
```typescript
// ❌ FAILS: Only creates blob URL
const url = URL.createObjectURL(file)
setPdfUrl(url)
```

**Console Output:** Nothing logged - no diagnostics

**Fix:**
```typescript
// ✅ CORRECT: Upload to server
const formData = new FormData()
formData.append('file', file)
const response = await fetch('/api/upload', { method: 'POST', body: formData })
const { url } = await response.json()
setPdfUrl(url)
```

---

### Step 2: API Upload Route
**Status:** ✅ WORKING (but never called)
- Has BLOB_READ_WRITE_TOKEN validation
- Logs all critical steps
- Returns URL successfully

**Console Output When Working:**
```
[v0] Upload route called
[v0] FormData received
[v0] File details: { name: "...", size: ..., type: "..." }
[v0] Environment check: { hasBlobToken: true, ... }
[v0] Starting Blob upload...
[v0] Blob upload successful: https://...
```

**Console Output When Failing:**
```
[v0] No file in FormData          // Step 1 failed
[v0] File too large: ...          // 50MB limit exceeded
[v0] BLOB_READ_WRITE_TOKEN not found  // Env var missing
[v0] Blob upload failed: ...      // Network/permission error
```

---

### Step 3: PDF.js Loading
**Current Code:**
```typescript
<PDFCanvasViewer
  pdfUrl={pdfUrl}  // Could be blob or http URL
  ...
/>
```

**Potential Issues:**
- Blob URLs work for local files only
- HTTP URLs need CORS headers
- Signed URLs need proper expiration handling

**Console Output:**
```
// ✅ Blob URLs work fine
pdf.js:1234 Warning: Custom ICC profile requested, but it is not supported by this implementation
getDocument.promise → Promise resolved (PDF loaded)

// ❌ HTTP URLs fail with CORS
Access to XMLHttpRequest from origin blocked by CORS policy
pdf.js:1234 Error loading PDF: CORS error

// ❌ Signed URLs fail with expiration
pdf.js:1234 Error loading PDF: 403 Forbidden (URL expired)
```

---

## Root Cause Analysis

**The Issue:** `handlePdfUpload` function skips the entire upload flow

**Why It's Failing:**
1. File input triggers, creates blob URL only
2. Upload API never called
3. No server-side persistence to Supabase
4. No database record in plan_viewer table
5. No audit trail in collaboration tables

**Symptoms User Sees:**
- "File uploads but disappears on refresh"
- "Can't see PDF in list of documents"
- "Markups don't persist across sessions"

---

## Solution: Complete Upload Flow

### 1. Update plan-viewer/page.tsx
```typescript
const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) {
    console.error('[v0] No file selected')
    return
  }

  console.log('[v0] Upload started:', { name: file.name, size: file.size })
  
  try {
    setIsLoading(true)
    
    // Step 1: Upload to server
    const formData = new FormData()
    formData.append('file', file)
    
    console.log('[v0] Sending file to API...')
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[v0] Upload API error:', error)
      alert(`Upload failed: ${error.error}`)
      return
    }

    const { url } = await response.json()
    console.log('[v0] File uploaded successfully:', url)

    // Step 2: Save to Supabase database
    const { error: dbError } = await supabase
      .from('pdf_files')
      .insert([
        {
          name: file.name,
          url: url,
          uploaded_by: user?.id,
          size: file.size,
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error('[v0] Database insert error:', dbError)
      alert('Saved to cloud but database record failed')
      return
    }

    // Step 3: Load PDF and clear markups
    setPdfUrl(url)
    dispatch({ type: 'SET_MARKUPS', payload: [] })
    console.log('[v0] Upload complete, PDF ready')
    
  } catch (error) {
    console.error('[v0] Upload error:', error)
    alert('Upload failed: ' + String(error))
  } finally {
    setIsLoading(false)
  }
}
```

### 2. Add Supabase Client
```typescript
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## Expected Console Output After Fix

### Success Path:
```
[v0] Upload started: { name: "floor-plan.pdf", size: 2458634 }
[v0] Sending file to API...
[v0] Upload route called
[v0] File details: { name: "floor-plan.pdf", size: 2458634, type: "application/pdf" }
[v0] Environment check: { hasBlobToken: true, tokenPrefix: "vercel_blob..." }
[v0] Starting Blob upload...
[v0] Blob upload successful: https://blob.vercel-storage.com/...
[v0] File uploaded successfully: https://blob.vercel-storage.com/...
[v0] Upload complete, PDF ready
pdf.js:1234 Warning: Custom ICC profile requested (normal warning, can ignore)
```

### Failure Points & What They Mean:

| Console Output | Meaning | Fix |
|---|---|---|
| `[v0] No file selected` | User didn't select file or cancelled | N/A, user action |
| `Sending file to API...` (hangs) | Network timeout or API not responding | Check Next.js server |
| `[v0] No file in FormData` | FormData malformed on client | Check fetch() body |
| `File too large: 54MB` | PDF exceeds 50MB limit | Split PDF or increase limit |
| `BLOB_READ_WRITE_TOKEN not found` | Missing env var | Add to .env.local |
| `[v0] Blob upload failed: 403` | Invalid token or permissions | Check Vercel Blob settings |
| `Database insert error: ...` | Supabase database issue | Check RLS policies, user ID |
| `Access to XMLHttpRequest blocked by CORS` | Loading PDF from wrong origin | Use /api/proxy or CORS headers |

---

## Testing Checklist

- [ ] Console shows all [v0] logs in sequence
- [ ] File appears in Supabase Storage
- [ ] Entry added to pdf_files table
- [ ] PDF.js successfully loads PDF
- [ ] Markups persist on page refresh
- [ ] File visible in markup list
- [ ] Can draw/edit markups on PDF
