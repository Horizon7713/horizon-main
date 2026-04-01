#!/bin/bash
# Copy PDF.js worker from node_modules to public folder
# This ensures PDF.js can load the worker without CORS issues

echo "[Setup] Copying PDF.js worker file..."

if [ ! -f "node_modules/pdfjs-dist/build/pdf.worker.min.js" ]; then
    echo "[Error] pdf.worker.min.js not found in node_modules"
    echo "[Error] Make sure pdfjs-dist is installed: npm install pdfjs-dist"
    exit 1
fi

mkdir -p public
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js

echo "[Success] PDF worker copied to public/pdf.worker.min.js"
echo "[Info] The PDFCanvasViewer will now load the worker from /public/pdf.worker.min.js"
