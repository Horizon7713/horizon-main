import { NextResponse } from "next/server"
import { COST_CODES } from "@/lib/cost-codes"

type SuggestedCostCode = {
  code: string | null
  label: string | null
  fullPath: string | null
  confidence: number
  reason: string
}

type ReceiptAnalysisData = {
  total_cost: number | null
  vendor_name: string | null
  merchant: string | null
  auth_code: string | null
card_used: string | null
  category:
    | "lumber"
    | "concrete"
    | "finish"
    | "gas"
    | "framing"
    | "small_tool"
    | "equipment"
    | "plumbing"
    | "electrical"
    | "other"
    | null
  project_name: string | null
  items: Array<{
    name: string
    quantity: number | null
    price: number | null
    suggested_cost_code?: SuggestedCostCode
  }>
  suggested_cost_code: SuggestedCostCode
  confidencePercentage: number
  imageQuality: "good" | "poor" | "unreadable"
  uncertainFields: string[]
}

function extractJson(text: string) {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const firstBrace = cleaned.indexOf("{")
    const lastBrace = cleaned.lastIndexOf("}")

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("AI response did not contain valid JSON.")
    }

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
  }
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
    .trim()

  const parsed = Number.parseFloat(cleaned)

  return Number.isFinite(parsed) ? parsed : null
}

function toStringOrNull(value: unknown) {
  if (value === null || value === undefined) return null

  const text = String(value).trim()

  return text.length > 0 ? text : null
}

function clampConfidence(value: unknown) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) return 0

  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function normalizeImageQuality(value: unknown): "good" | "poor" | "unreadable" {
  if (value === "good" || value === "poor" || value === "unreadable") {
    return value
  }

  return "poor"
}

function normalizeCategory(value: unknown): ReceiptAnalysisData["category"] {
  const category = String(value || "").trim()

  const allowedCategories: Array<NonNullable<ReceiptAnalysisData["category"]>> = [
    "lumber",
    "concrete",
    "finish",
    "gas",
    "framing",
    "small_tool",
    "equipment",
    "plumbing",
    "electrical",
    "other",
  ]

  if (allowedCategories.includes(category as NonNullable<ReceiptAnalysisData["category"]>)) {
    return category as ReceiptAnalysisData["category"]
  }

  return null
}

function findCostCode(code: unknown, label: unknown, fullPath: unknown) {
  const codeText = toStringOrNull(code)
  const labelText = toStringOrNull(label)
  const fullPathText = toStringOrNull(fullPath)

  if (codeText) {
    const exact = COST_CODES.find((costCode) => costCode.code === codeText)

    if (exact) return exact
  }

  if (fullPathText) {
    const exact = COST_CODES.find((costCode) => costCode.fullPath === fullPathText)

    if (exact) return exact
  }

  if (labelText) {
    const exact = COST_CODES.find(
      (costCode) => costCode.label.toLowerCase() === labelText.toLowerCase(),
    )

    if (exact) return exact
  }

  return null
}

function normalizeSuggestedCostCode(value: unknown): SuggestedCostCode {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const matched = findCostCode(raw.code, raw.label, raw.fullPath)

  if (matched) {
    return {
      code: matched.code,
      label: matched.label,
      fullPath: matched.fullPath,
      confidence: clampConfidence(raw.confidence),
      reason: toStringOrNull(raw.reason) || "Matched to the closest construction cost code.",
    }
  }

  return {
    code: toStringOrNull(raw.code),
    label: toStringOrNull(raw.label),
    fullPath: toStringOrNull(raw.fullPath),
    confidence: clampConfidence(raw.confidence),
    reason: toStringOrNull(raw.reason) || "",
  }
}

function normalizeAnalysisData(rawData: Record<string, unknown>): ReceiptAnalysisData {
  const rawItems = Array.isArray(rawData.items) ? rawData.items : []

  return {
    total_cost: toNumberOrNull(rawData.total_cost),
    vendor_name: toStringOrNull(rawData.vendor_name),
    merchant: toStringOrNull(rawData.merchant),
    auth_code: toStringOrNull(rawData.auth_code),
card_used: toStringOrNull(rawData.card_used),
    category: normalizeCategory(rawData.category),
    project_name: toStringOrNull(rawData.project_name),
    items: rawItems.map((rawItem) => {
      const item = rawItem && typeof rawItem === "object" ? (rawItem as Record<string, unknown>) : {}

      return {
        name: toStringOrNull(item.name) || "",
        quantity: toNumberOrNull(item.quantity),
        price: toNumberOrNull(item.price),
        suggested_cost_code: item.suggested_cost_code
          ? normalizeSuggestedCostCode(item.suggested_cost_code)
          : undefined,
      }
    }),
    suggested_cost_code: normalizeSuggestedCostCode(rawData.suggested_cost_code),
    confidencePercentage: clampConfidence(rawData.confidencePercentage),
    imageQuality: normalizeImageQuality(rawData.imageQuality),
    uncertainFields: Array.isArray(rawData.uncertainFields)
      ? rawData.uncertainFields.map(String)
      : [],
  }
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

    const costCodeContext = COST_CODES.map((costCode) => {
      return `${costCode.code} - ${costCode.label} (${costCode.fullPath})`
    }).join("\n")

    const prompt = `Analyze this construction receipt image and return JSON with exactly this shape:

{
  "total_cost": number | null,
  "vendor_name": string | null,
  "merchant": string | null,
  "auth_code": string | null,
"card_used": string | null,
  "category": "lumber" | "concrete" | "finish" | "gas" | "framing" | "small_tool" | "equipment" | "plumbing" | "electrical" | "other" | null,
  "project_name": string | null,
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "price": number | null,
      "suggested_cost_code": {
        "code": string | null,
        "label": string | null,
        "fullPath": string | null,
        "confidence": number,
        "reason": string
      }
    }
  ],
  "suggested_cost_code": {
    "code": string | null,
    "label": string | null,
    "fullPath": string | null,
    "confidence": number,
    "reason": string
  },
  "confidencePercentage": number,
  "imageQuality": "good" | "poor" | "unreadable",
  "uncertainFields": string[]
}

Cost code rules:
- You must choose a suggested_cost_code for every item in the items array.
- Do not leave item suggested_cost_code null unless the item is unreadable or not construction-related.
- Pick the best cost code for each individual item, not just the overall receipt.
- Prefer material-specific codes over broad parent codes.
- Use the most specific matching cost code when possible.
- The item-level suggested_cost_code is required even when the overall receipt also has a suggested_cost_code.
- Only choose cost codes from the allowed list below.
- The "code", "label", and "fullPath" must exactly match the selected allowed cost code.
- If multiple codes have the same number, use the fullPath that best matches the item.
- If no exact match exists, choose the closest reasonable construction cost code from the allowed list and explain the uncertainty in reason.
- Only return null for code, label, and fullPath if the item is unreadable or completely unrelated to construction.

Allowed cost codes:
${costCodeContext}

Receipt extraction rules:
- total_cost should be the final receipt total, not subtotal, if visible.
- vendor_name should be the store/vendor name.
- Extract the receipt authorization code if visible. It may appear as AUTH CODE, AUTH, APPROVAL, APPR CODE, Authorization, or Approval Code.
- Extract the card used only when the value is clearly tied to a payment card line.
- Valid card lines may include VISA, Mastercard, Master Card, AMEX, American Express, Discover, Debit, Credit, Card, Account, Acct, Ending, Ends In, Last 4, or Last Four.
- Return the card value as a normalized short label like "Visa 1234", "Mastercard 9876", "Amex 1005", "Discover 4421", "Debit 1234", or "Card ending 1234".
- Never return the full card number. Only return the card brand and last 4 digits when visible.
- Do not use AUTH CODE, APPROVAL CODE, APPR CODE, transaction number, terminal ID, invoice number, order number, merchant ID, store number, register number, reference number, or cashier number as the card used.
- If the card last 4 is uncertain, return null.
- If no card information is visible, return null.
- merchant can match vendor_name if there is not a separate merchant field.
- confidencePercentage should represent confidence in the extracted receipt data.
- imageQuality should be "unreadable" if the receipt cannot be read well enough.
- category should be the best simple construction category.
- Use "other" if no simple category fits.
- Return valid JSON only.`

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
              "You extract structured receipt data for construction software. Return only valid JSON. Preserve vendor names, prices, quantities, construction material names, and choose cost codes only from the allowed list.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
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
    const parsedData = extractJson(content)
    const data = normalizeAnalysisData(parsedData)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("[analyze-receipt-fast] Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze receipt.",
      },
      { status: 500 },
    )
  }
}