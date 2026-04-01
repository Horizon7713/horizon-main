1️⃣ PDF Worker Setup:
- Rename any Node CLI script from .tsx → .ts to avoid React/Next compiler errors:
  mv scripts/setup-pdf-worker.tsx scripts/setup-pdf-worker.ts
- Move the script outside frontend directories (pages/app) so Next.js does not bundle it.
- Replace the script with a build-time copy using Node fs:
  import { copyFileSync, mkdirSync } from 'fs';
  
  mkdirSync('public', { recursive: true });
  copyFileSync(
    'node_modules/pdfjs-dist/build/pdf.worker.min.js',
    'public/pdf.worker.min.js'
  );
  console.log('PDF.js worker copied to /public/pdf.worker.min.js');
- Add this to package.json build script:
  "build": "ts-node scripts/setup-pdf-worker.ts && next build"
- Deploy to Vercel; worker will be available at /public/pdf.worker.min.js automatically.

2️⃣ GoTrueClient Cleanup:
- Create a single shared Supabase auth client in one module:
  // lib/supabaseClient.ts
  import { GoTrueClient } from '@supabase/supabase-js'

  export const authClient = new GoTrueClient({
    url: 'https://sb-yfxbterobzaduczasunc.supabase.co/auth/v1',
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
  });
- Import and reuse authClient everywhere; do NOT instantiate multiple GoTrueClient instances.
- This removes “Multiple GoTrueClient instances detected” warnings in the browser console.

3️⃣ Verify:
- PDF.js renders properly in your PDFCanvasViewer.
- No compiler errors related to shebang or fs/path.
- GoTrueClient warnings disappear.
- Vercel deployment works with zero runtime Node scripts in the frontend.
