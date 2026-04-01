# PDF Markup Application - Deployment & Setup Guide

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```
This will automatically run the postinstall script which copies `pdf.worker.min.js` to `/public`.

### 2. Start Development Server
```bash
npm run dev
```

The app will run at `http://localhost:3000` with:
- ESM worker loaded from `_next/static` (dev mode)
- PDFs rendered correctly with markups
- Full debug logging in console

### 3. Verify PDF Viewer Works
1. Navigate to the PDF plan viewer page
2. Upload a PDF file
3. Open DevTools (F12) → Network tab
4. Check for worker loading:
   - Dev: Look for `pdf.worker.min.mjs?url` → Status 200
   - Prod: Look for `/pdf.worker.min.js` → Status 200
5. Check Console for logs starting with `[PDF.js]` and `[PDF Load]`

## Production Deployment to Vercel

### Prerequisites
- Vercel account connected to GitHub
- Repository pushed to GitHub
- All environment variables configured in Vercel project settings

### Step 1: Configure Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
```

### Step 2: Build Locally (Recommended First)
```bash
# Clean build
rm -rf .next

# Build for production
npm run build

# Verify build succeeds and pdf.worker.min.js is included
ls -la public/pdf.worker.min.js
```

### Step 3: Commit Changes
```bash
git add .
git commit -m "Setup: Add PDF worker and deployment configuration"
git push origin main
```

### Step 4: Deploy to Vercel
Push to GitHub and Vercel will automatically:
1. Run `npm install` (which triggers postinstall script)
2. Copy `pdf.worker.min.js` to `public/`
3. Run `npm run build`
4. Deploy to production

Monitor deployment in Vercel Dashboard.

### Step 5: Verify Production Deployment

#### A. Check Worker File Deployment
```bash
# Should return 200 with worker code
curl https://your-domain.vercel.app/pdf.worker.min.js | head -20
```

#### B. Test in Browser
1. Go to `https://your-domain.vercel.app`
2. Open DevTools (F12)
3. Go to Network tab
4. Upload a PDF
5. Verify `/pdf.worker.min.js` loads with status **200** (not 404)

#### C. Check Console Logs
```
[PDF.js] Production worker loaded from /public/pdf.worker.min.js
[PDF Load] Fetching PDF from URL: https://...
[PDF Load] PDF fetched, byte length: XXXXX
[PDF Load] PDF loaded successfully with X pages
```

## CORS Configuration for PDFs

### Local Testing with Vercel Blob
If using Vercel Blob for PDF storage:
1. PDFs are automatically CORS-enabled
2. No additional configuration needed
3. Works from any origin

### External PDF URLs
If serving PDFs from external source, ensure:

```javascript
// In your PDF upload/fetch code
const response = await fetch(pdfUrl, {
  headers: { 'Accept': 'application/pdf' }
})
```

Verify CORS headers returned:
```
Access-Control-Allow-Origin: *
(or your specific origin)
```

## File Structure for Production

```
/public/
  └── pdf.worker.min.js          ← Auto-copied by postinstall script

/scripts/
  └── setup-pdf-worker.js        ← Postinstall script

/components/pdf-viewer/
  └── pdf-canvas-viewer.tsx      ← Production-ready component
                                   (Uses /public/pdf.worker.min.js in prod)

/package.json                     ← Has postinstall script configured
```

## Troubleshooting Production Issues

### Issue: "404 Not Found" for /pdf.worker.min.js
**Solution:**
1. Verify `public/pdf.worker.min.js` exists locally
2. Check Vercel build logs for errors
3. Re-deploy: Push a new commit to trigger rebuild
4. In Vercel Dashboard → Deployments → Redeploy

### Issue: PDFs not rendering / blank canvas
**Solutions:**
1. Check browser console for errors
2. Verify PDF URL is accessible (check Network tab)
3. Verify CORS headers are present
4. Check that worker file loaded successfully (Network tab)

### Issue: Worker file loaded but PDFs still don't render
**Solutions:**
1. Verify pdfjs-dist version matches in code and node_modules
2. Check for JavaScript errors in console
3. Verify PDF file is valid (try opening in browser directly)
4. Check memory usage (large PDFs require significant memory)

## Environment-Specific Behavior

### Development (`npm run dev`)
- Worker: Loaded via ESM import `?url` from `_next/static`
- Logs: Verbose debug logging with `[PDF.js]` prefix
- Performance: Not optimized (for debugging)
- Source maps: Available

### Production (`npm run build && npm run start`)
- Worker: Loaded from `/public/pdf.worker.min.js`
- Logs: Production logs only
- Performance: Optimized
- Source maps: Minified

### Vercel Deployment
- Worker: Copied to `public/` by postinstall script
- Deployment: Automatic on git push
- Logs: Check Vercel dashboard
- Status: Real-time status page

## Performance Checklist

- [ ] PDF files load in <2 seconds
- [ ] Worker file loads with status 200 (not 404)
- [ ] PDFs render correctly on first page
- [ ] Page navigation works smoothly
- [ ] Markups render without flicker
- [ ] Zoom controls work smoothly
- [ ] Memory usage stays <100MB for typical PDFs
- [ ] No console errors or warnings

## Security Considerations

### CORS
- PDFs must be CORS-accessible or served same-origin
- Vercel Blob handles CORS automatically
- Check `Access-Control-Allow-Origin` headers if issues

### PDF Validation
- Component validates PDF signature
- Rejects invalid files with user-friendly error
- No arbitrary code execution (PDF.js disables JS in PDFs)

### User Data
- Markups stored in Supabase with RLS policies
- Only authenticated users can create/view markups
- All operations logged for audit

## Monitoring in Production

### Key Metrics to Track
1. **Worker Load Time**: Should be <100ms
2. **PDF Render Time**: Should be <500ms per page
3. **Error Rate**: Track failed PDF loads
4. **User Engagement**: Page views, markup creation rate

### Logging
Check Vercel logs:
```bash
# View production logs
vercel logs --tail
```

## Rollback Procedure

If production deployment has issues:

```bash
# Option 1: Revert last commit
git revert HEAD
git push

# Option 2: Use Vercel dashboard to redeploy previous version
# Vercel Dashboard → Deployments → Select previous → Redeploy
```

## Documentation Files
- `DEPLOYMENT_GUIDE.md` ← You are here
- `QUICK_REFERENCE.md` - Quick setup steps
- `DOCUMENTATION_INDEX.md` - Navigation guide
- `COMPLETE_FIX_SUMMARY.md` - Technical details

## Support
For issues:
1. Check console logs for `[PDF.js]` or `[PDF Load]` messages
2. Verify `/pdf.worker.min.js` loads in Network tab with status 200
3. Check that pdfjs-dist is installed: `npm list pdfjs-dist`
4. Verify Node.js version: `node --version` (should be 18+)
