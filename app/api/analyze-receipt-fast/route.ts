import { NextResponse } from "next/server"

function extractJson(text: string) {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim()

  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const imageBase64 = String(body.imageBase64 || "")
    const mimeType = String(body.mimeType || "image/jpeg")

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "Missing receipt image." },
        { status: 400 },
      )
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing OPENAI_API_KEY." },
        { status: 500 },
      )
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract structured receipt data for construction software. Return only valid JSON. Preserve vendor names, prices, quantities, and construction material names. If a field is unknown, return null or an empty array.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Analyze this receipt image and return JSON with exactly this shape:
{
  "total_cost": number | null,
  "vendor_name": string | null,
  "merchant": string | null,
  "category": "lumber" | "concrete" | "finish" | "gas" | "framing" | "small_tool" | "equipment" | "plumbing" | "electrical" | "other" | null,
  "project_name": string | null,
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "price": number | null
    }
  ],
  "confidencePercentage": number,
  "imageQuality": "good" | "poor" | "unreadable",
  "uncertainFields": string[]
}

Rules:
- total_cost should be the final receipt total, not subtotal, if visible.
- confidencePercentage should represent how confident you are in the extracted fields.
- category should be the best construction cost category.
- Use "other" if no category fits.
- Return valid JSON only.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      return NextResponse.json(
        {
          success: false,
          error: errorText || "Receipt analysis failed.",
        },
        { status: 500 },
      )
    }

    const result = await response.json()
    const content = result?.choices?.[0]?.message?.content || "{}"
    const data = extractJson(content)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("[analyze-receipt-fast] Error:", error)

    return NextResponse.json(
      { success: false, error: "Failed to analyze receipt." },
      { status: 500 },
    )
  }
}