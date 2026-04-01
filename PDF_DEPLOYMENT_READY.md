# PDF Viewer - Production Deployment Ready

## ✅ Setup Complete

Everything is configured for production deployment to Vercel. The PDF.js worker will be automatically copied during the build process.

## Build Process

The `npm run build` script now:

1. **Runs setup script**: `node scripts/setup-pdf-worker.js`
   - Copies `pdf.worker.min.js` from node_modules to `/public`
   - Creates `/public` directory if needed
   - Exits with error if worker file not found

2. **Builds Next.js**: `next build`
   - Includes the worker file in the build output
   - Worker available at `/pdf.worker.min.js` in production

## Environment Detection

**pdf-canvas-viewer.tsx** automatically detects the environment:

```typescript
if (process.env.NODE_ENV === 'production') {
  // Production: Use worker from /public
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
} else {
  // Development: Use ESM import with ?url
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
}
```

## Deployment Steps

### 1. Local Testing (Before Deploying)

```bash
# Build locally
npm run build

# Verify worker file was copied
ls -la public/pdf.worker.min.js  # Should exist

# Start production build
npm start

# Test in browser
# - Open http://localhost:3000
# - Upload a PDF
# - Check DevTools → Network: /pdf.worker.min.js should return 200
# - Check DevTools → Console: Should log "[PDF.js] Production worker loaded from /public/pdf.worker.min.js"
```

### 2. Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "Setup: Configure PDF worker for production deployment"

# Push to GitHub (auto-deploys to Vercel)
git push origin main
```

Vercel will automatically:
- Run `npm install` (restores pdfjs-dist)
- Run `npm run build` (executes setup script, copies worker, builds Next.js)
- Deploy to production

### 3. Verify Production Deployment

After Vercel deployment completes:

1. **Check Build Logs**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - View Build Logs
   - Should see: `[PDF Worker] ✓ Copied pdf.worker.min.js to /public/pdf.worker.min.js`

2. **Verify in Browser**
   - Visit your deployed app
   - Open DevTools (F12)
   - Go to Console tab
   - Should see: `[PDF.js] Production worker loaded from /public/pdf.worker.min.js`
   - Go to Network tab
   - Upload a PDF
   - Filter by "worker"
   - Should see `pdf.worker.min.js` with status **200 OK**

3. **Test PDF Functionality**
   - Upload a PDF
   - Verify it renders correctly
   - Add markups
   - Verify markups render
   - Test zoom/pan

## Troubleshooting

### Worker Returns 404

**Problem**: Network tab shows `/pdf.worker.min.js` with status 404

**Solution**:
1. Check Vercel build logs for setup script errors
2. Verify worker file was copied: Check deployment logs for `[PDF Worker] ✓ Copied`
3. If missing, redeploy: Push a commit to trigger new build

### Worker Shows 404 But App Works in Dev

**Problem**: Works in development but not in production

**Solution**:
- Dev uses ESM import, production uses `/public/pdf.worker.min.js`
- Verify production build locally: `npm run build && npm start`
- Check `/public/pdf.worker.min.js` exists after build

### PDF Doesn't Load

**Problem**: PDF renders but shows blank or error

**Solution**:
1. Check console for errors
2. Verify `/pdf.worker.min.js` loads (200 status)
3. Verify PDF blob URL/fetch is CORS-accessible
4. Check PDF file size (> 100MB may need timeout adjustment)

## File Structure

```
project/
├── scripts/
│   └── setup-pdf-worker.js         ← Copies worker during build
├── components/pdf-viewer/
│   └── pdf-canvas-viewer.tsx       ← Uses /public/pdf.worker.min.js in prod
├── public/
│   └── pdf.worker.min.js           ← Created during build
├── package.json                     ← Build script runs setup
└── node_modules/pdfjs-dist/        ← Contains source worker file
```

## Key Points

- ✅ No environment variables needed
- ✅ Works in development (ESM import)
- ✅ Works in production (public file)
- ✅ Automatic setup during build
- ✅ No manual file copying required
- ✅ Vercel handles everything automatically

## Next Steps

1. ✅ Setup script created (`scripts/setup-pdf-worker.js`)
2. ✅ Build script updated (runs setup before build)
3. ✅ Component configured (auto-detects environment)
4. Test locally: `npm run build && npm start`
5. Deploy to Vercel: `git push origin main`
6. Verify in Vercel deployment

You're ready to deploy! 🚀
