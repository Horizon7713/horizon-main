"use server"

import { z } from "zod"
import { generateObject } from "ai"

const receiptDataSchema = z.object({
  total_cost: z.number().optional().default(0).describe("The total cost or total amount on the receipt"),
  currency: z.string().optional().default("USD").describe("The currency symbol or code (e.g., USD, $)"),
  merchant: z.string().optional().default("").describe("The merchant or store name"),
  date: z.string().optional().default("").describe("The date on the receipt"),
  items: z
    .array(
      z.object({
        name: z.string().describe("The item or product name"),
        quantity: z.number().optional().describe("The quantity purchased"),
        price: z.number().optional().describe("The price of this item"),
      }),
    )
    .default([])
    .describe("List of items purchased on the receipt"),
  confidencePercentage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(50)
    .describe(
      "Your confidence level as a percentage (0-100) in the accuracy of ALL extracted data. 90-100 = all values are clear and certain. 70-89 = most values are clear with minor uncertainty. 50-69 = some values are unclear or partially readable. Below 50 = image quality is poor or values are very uncertain.",
    ),
  imageQuality: z
    .enum(["good", "poor", "unreadable"])
    .optional()
    .default("poor")
    .describe(
      "Assessment of the receipt image quality. Good = clear and readable. Poor = blurry or faded but partially readable. Unreadable = too blurry, dark, or damaged to read accurately.",
    ),
  uncertainFields: z
    .array(z.string())
    .default([])
    .describe(
      "List of field names that you are uncertain about due to image quality or unclear text (e.g., 'total_cost', 'item_name', 'prices')",
    ),
})

export async function analyzeReceipt(imageBase64: string, mimeType: string) {
  try {
    console.log("[v0] Starting receipt analysis using Vercel AI Gateway...")
    const startTime = Date.now()

    const receiptDataSchema = z.object({
      total_price: z.number().describe("The final total amount on the receipt"),
      vendor_name: z.string().describe("The store/business name"),
      items: z.array(
        z.object({
          name: z.string().describe("The item name"),
          quantity: z.number().optional().describe("The quantity"),
          price: z.number().optional().describe("The item price"),
        })
      ).describe("List of items purchased"),
      confidencePercentage: z.number().min(0).max(100).describe("Confidence level 0-100"),
      imageQuality: z.enum(["good", "poor", "unreadable"]).describe("Image quality assessment"),
    })

    const { object } = await generateObject({
      model: "openai/gpt-4o",
      schema: receiptDataSchema,
      prompt: `You are an expert at extracting structured data from receipt images. Analyze this receipt and extract the total price, vendor name, and all items purchased.

CRITICAL EXTRACTION RULES:
1. **Total Price**: Extract ONLY the final "Total" line - never use subtotals, taxes, or discounts
2. **Vendor Name**: The business/store name typically at the top
3. **Confidence**: Rate 0-100 where 95-100 = crystal clear, 85-94 = clearly visible, 75-84 = mostly clear, 60-74 = some uncertainty, Below 60 = poor image quality`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageBase64,
            }
          ]
        }
      ]
    })

    const elapsedTime = Date.now() - startTime
    console.log("[v0] Receipt analysis result:", object)
    console.log(`[v0] Analysis completed in ${elapsedTime}ms`)

    return {
      success: true,
      data: {
        total_cost: object.total_price ?? 0,
        currency: "$",
        merchant: object.vendor_name ?? "",
        date: "",
        items: object.items ?? [],
        confidencePercentage: object.confidencePercentage ?? 50,
        imageQuality: object.imageQuality ?? "poor",
        uncertainFields: [],
      },
    }
  } catch (error) {
    console.error("[v0] Error analyzing receipt:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze receipt",
    }
  }
}

export async function analyzeReceiptWithOCR(ocrText: string) {
  try {
    console.log("[v0] Analyzing receipt with OCR-extracted text using Vercel AI Gateway...")
    const startTime = Date.now()

    const receiptDataSchema = z.object({
      total_price: z.number().describe("The final total amount on the receipt"),
      vendor_name: z.string().describe("The store/business name"),
      items: z.array(
        z.object({
          name: z.string().describe("The item name"),
          quantity: z.number().optional().describe("The quantity"),
          price: z.number().optional().describe("The item price"),
        })
      ).describe("List of items purchased"),
      confidencePercentage: z.number().min(0).max(100).describe("Confidence level 0-100"),
      imageQuality: z.enum(["good", "poor", "unreadable"]).describe("Image quality assessment"),
    })

    const { object } = await generateObject({
      model: "openai/gpt-4o",
      schema: receiptDataSchema,
      system: `You are an expert at extracting structured data from receipt text. Parse OCR-extracted receipt text and extract the total price, vendor name, and all items purchased.

CRITICAL EXTRACTION RULES:
1. **Total Price**: Extract ONLY the final "Total" line - never use subtotals, taxes, or discounts. Must be a valid number.
2. **Vendor Name**: The business/store name typically at the top. If not found, return empty string.
3. **Items**: Extract all line items with quantities and prices when available.
4. **Confidence**: Rate 0-100 where 95-100 = crystal clear, 85-94 = clearly visible, 75-84 = mostly clear, 60-74 = some uncertainty, Below 60 = poor OCR quality
5. **Image Quality**: Assess based on OCR text clarity - good if clear and complete, poor if some text is garbled, unreadable if mostly illegible.

Always return valid numbers for total_price and prices. If a field cannot be determined, use sensible defaults (0 for numbers, empty string for text).`,
      messages: [
        {
          role: "user",
          content: `Please extract receipt data from this OCR text:\n\n${ocrText}`,
        }
      ]
    })

    const elapsedTime = Date.now() - startTime
    console.log("[v0] Receipt analysis result:", object)
    console.log(`[v0] OCR analysis completed in ${elapsedTime}ms`)

    return {
      success: true,
      data: {
        total_cost: object.total_price ?? 0,
        currency: "$",
        merchant: object.vendor_name ?? "",
        date: "",
        items: object.items ?? [],
        confidencePercentage: object.confidencePercentage ?? 50,
        imageQuality: object.imageQuality ?? "poor",
        uncertainFields: [],
      },
    }
  } catch (error) {
    console.error("[v0] Error analyzing receipt with OCR:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze receipt",
    }
  }
}
