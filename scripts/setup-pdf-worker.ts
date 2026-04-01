import fs from 'fs'
import path from 'path'

/**
 * PDF.js Worker Auto-Setup
 * Copies pdf.worker.min.js from node_modules to /public automatically
 * Runs during prebuild before Next.js build starts
 */
const src = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js')
const dest = path.join(process.cwd(), 'public', 'pdf.worker.min.js')

fs.copyFileSync(src, dest)
console.log('[PDF Worker] Copied pdf.worker.min.js to /public')
