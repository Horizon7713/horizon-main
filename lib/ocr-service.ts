import Tesseract from 'tesseract.js'

export async function extractReceiptTextFromImage(imageBase64: string): Promise<string> {
  try {
    console.log("[v0] Starting OCR extraction from receipt image...")
    
    // Convert base64 to buffer
    const binaryString = Buffer.from(imageBase64, 'base64').toString('binary')
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Run Tesseract OCR
    const result = await Tesseract.recognize(bytes, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing') {
          console.log(`[v0] OCR progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    const extractedText = result.data.text
    console.log("[v0] OCR extraction complete. Extracted text length:", extractedText.length)
    console.log("[v0] Confidence:", result.data.confidence)

    return extractedText
  } catch (error) {
    console.error("[v0] Error during OCR extraction:", error)
    throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function isSimpleReceipt(text: string): boolean {
  // Count lines with prices (rough heuristic)
  const pricePattern = /\$?\d+\.?\d{0,2}/g
  const prices = text.match(pricePattern) || []
  
  // If there are 3 or fewer monetary amounts, it's likely a simple receipt
  return prices.length <= 3
}

export function parseSimpleReceipt(text: string): { total: number | null; vendor: string | null } {
  // Extract vendor name (usually first line or all caps line)
  const lines = text.split('\n').filter(l => l.trim())
  const vendor = lines.length > 0 ? lines[0].trim() : null

  // Extract last monetary amount as total
  const pricePattern = /\$?(\d+\.?\d{0,2})/g
  let lastPrice = null
  let match
  while ((match = pricePattern.exec(text))) {
    lastPrice = parseFloat(match[1])
  }

  return {
    total: lastPrice,
    vendor,
  }
}
