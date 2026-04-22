import { analyzeReceipt, analyzeReceiptWithOCR } from "@/app/messages/actions"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { method, imageBase64, mimeType, ocrText } = body

    if (method === "analyzeOCR" && ocrText) {
      console.log("[v0] API route: Using OCR text analysis...")
      const result = await analyzeReceiptWithOCR(ocrText)
      return NextResponse.json(result)
    } else if ((method === "analyzeImage" || !method) && imageBase64 && mimeType) {
      console.log("[v0] API route: Using image-based analysis...")
      const result = await analyzeReceipt(imageBase64, mimeType)
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { success: false, error: "Missing required data for analysis" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("[v0] Error in analyze-receipt API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      },
      { status: 500 }
    )
  }
}