const fs = require("fs")
const path = require("path")

const root = process.cwd()
const publicDir = path.join(root, "public")

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

function copyIfExists(sourceRelativePath, targetFileName) {
  const sourcePath = path.join(root, sourceRelativePath)
  const targetPath = path.join(publicDir, targetFileName)

  if (!fs.existsSync(sourcePath)) {
    console.warn(`[setup-pdf-worker] Source not found: ${sourceRelativePath}`)
    return
  }

  fs.copyFileSync(sourcePath, targetPath)
  console.log(`[setup-pdf-worker] Copied ${sourceRelativePath} -> public/${targetFileName}`)
}

copyIfExists(
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "pdf.worker.min.mjs"
)

copyIfExists(
  "node_modules/pdfjs-dist/build/pdf.worker.mjs",
  "pdf.worker.mjs"
)