import Tesseract from 'tesseract.js'

export async function extractReceiptTextFromImage(
  imageBase64: string,
  mimeType: string = "image/png",
): Promise<string> {
  try {
    console.log("[v0] Starting OCR extraction from receipt image...")

    const imageDataUrl = `data:${mimeType};base64,${imageBase64}`

    const result = await Tesseract.recognize(imageDataUrl, "eng", {
      logger: (m) => {
        if (m.status === "recognizing") {
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
    throw new Error(
      `OCR extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
