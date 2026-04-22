import { analyzeReceipt, analyzeReceiptWithOCR } from "@/app/messages/actions"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.error("[v0] Missing OPENAI_API_KEY in server environment")

      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: OPENAI_API_KEY is missing",
        },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { method, imageBase64, mimeType, ocrText } = body

    if (method === "analyzeOCR" && ocrText) {
      console.log("[v0] API route: Using OCR text analysis...")
      const result = await analyzeReceiptWithOCR(ocrText)
      return NextResponse.json(result)
    }

    if ((method === "analyzeImage" || !method) && imageBase64 && mimeType) {
      console.log("[v0] API route: Using image-based analysis...")
      const result = await analyzeReceipt(imageBase64, mimeType)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { success: false, error: "Missing required data for analysis" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[v0] Error in analyze-receipt API:", error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : "Unknown server error during receipt analysis",
      },
      { status: 500 }
    )
  }
}