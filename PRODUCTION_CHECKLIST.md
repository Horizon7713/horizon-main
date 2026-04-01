# Production Readiness Checklist

## Pre-Deployment

### Code Verification
- [ ] `npm install` runs successfully (postinstall creates `/public/pdf.worker.min.js`)
- [ ] `npm run build` completes without errors
- [ ] `ls -la public/pdf.worker.min.js` shows file exists
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No ESLint errors: `npm run lint`

### Local Testing
- [ ] `npm run dev` starts successfully
- [ ] Open `http://localhost:3000`
- [ ] Navigate to PDF viewer page
- [ ] Upload a test PDF file
- [ ] Check DevTools Console for `[PDF.js] Dev worker loaded via ESM import`
- [ ] PDF renders on canvas
- [ ] Page navigation works
- [ ] Zoom controls work
- [ ] Can add markups

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set locally (in .env.local)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set locally
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set locally
- [ ] All env vars verified working (can authenticate)

## Deployment Steps

### Step 1: Prepare Repository
- [ ] All changes committed: `git status` shows clean working directory
- [ ] Latest changes pulled: `git pull origin main`
- [ ] Ready to push: `git push origin main`

### Step 2: Vercel Configuration
- [ ] Vercel project created and linked to GitHub repo
- [ ] All environment variables added to Vercel project settings
- [ ] Git integration configured (auto-deploy on push)

### Step 3: Deploy
- [ ] Push to GitHub: `git push origin main`
- [ ] Monitor Vercel dashboard for deployment progress
- [ ] Wait for deployment to complete (should see green checkmark)

## Post-Deployment Verification

### Network & Files
- [ ] Visit deployed site (e.g., `https://your-app.vercel.app`)
- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Refresh page
- [ ] Look for `/pdf.worker.min.js` request
- [ ] Verify status is **200** (not 404)
- [ ] Check file size (should be ~100-200KB)

### Functionality Testing
- [ ] Login works
- [ ] Navigate to PDF viewer page
- [ ] Upload test PDF file
- [ ] Check Console for: `[PDF.js] Production worker loaded from /public/pdf.worker.min.js`
- [ ] PDF renders on first page
- [ ] Can navigate between pages
- [ ] Zoom in/out works
- [ ] Can create markups
- [ ] Markups persist on page reload

### Error Handling
- [ ] Try uploading invalid file (should show error)
- [ ] Try uploading very large file (should handle gracefully)
- [ ] Disconnect internet and try loading PDF (should show error)
- [ ] Check console for any red errors

### Performance
- [ ] First page loads within 2 seconds
- [ ] Page navigation is smooth
- [ ] Zoom doesn't stutter
- [ ] Memory usage stays reasonable

## Production Monitoring

### Ongoing Checks
- [ ] Monitor Vercel dashboard for errors
- [ ] Check error tracking (if configured)
- [ ] Monitor performance metrics
- [ ] Review user feedback for issues

### Logs to Monitor
```bash
# Check Vercel production logs
vercel logs --tail

# Look for these log patterns:
# SUCCESS: [PDF.js] Production worker loaded from /public/pdf.worker.min.js
# SUCCESS: [PDF Load] PDF loaded successfully
# ERROR: any red errors in console
```

## Rollback Criteria

Deploy a previous version if:
- [ ] PDFs not rendering in production (work in dev)
- [ ] `/pdf.worker.min.js` returns 404
- [ ] Worker initialization fails
- [ ] Significant performance degradation
- [ ] Critical bugs discovered

Rollback command:
```bash
# In Vercel dashboard: Deployments → Select previous → Redeploy
```

## Sign-Off

- [ ] Developer: All checks pass locally
- [ ] QA: Production site tested thoroughly
- [ ] Deployment: No errors in Vercel logs
- [ ] Monitoring: Set up and working
- [ ] Ready for production: YES / NO

Date: _____________
Deployed by: _____________
Verified by: _____________

## Troubleshooting Quick Reference

| Problem | Check | Solution |
|---------|-------|----------|
| 404 for /pdf.worker.min.js | Network tab in DevTools | Redeploy (postinstall script will copy file) |
| PDFs don't render | Browser console | Check for JavaScript errors |
| Blank canvas | Network tab | Verify PDF URL is accessible |
| Worker initialization fails | Console logs | Check pdfjsLib initialization |
| Performance issues | DevTools Performance tab | Check for memory leaks or CPU spikes |
