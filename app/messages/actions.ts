"use server"

import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import type { ModelMessage } from "ai"
import { z } from "zod"

const receiptResultSchema = z.object({
  total_price: z.number().describe("The final total amount on the receipt"),
  vendor_name: z.string().describe("The store/business name"),
  items: z
    .array(
      z.object({
        name: z.string().describe("The item name"),
        quantity: z.number().nullable().describe("The quantity"),
        price: z.number().nullable().describe("The item price"),
      })
    )
    .describe("List of items purchased"),
  confidencePercentage: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence level 0-100"),
  imageQuality: z
    .enum(["good", "poor", "unreadable"])
    .describe("Image quality assessment"),
})

export async function analyzeReceipt(imageBase64: string, mimeType: string) {
  try {
    console.log("[v0] Starting receipt analysis using Vercel AI Gateway...")
    const startTime = Date.now()

    const imageDataUrl = `data:${mimeType};base64,${imageBase64}`

    const messages: ModelMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an expert at extracting structured data from receipt images. Analyze this receipt and extract the total price, vendor name, and all items purchased.

CRITICAL EXTRACTION RULES:
1. Total Price: Extract ONLY the final "Total" line - never use subtotals, taxes, or discounts
2. Vendor Name: The business/store name typically at the top
3. Items: Extract all line items with quantities and prices when available
4. Confidence: Rate 0-100 where 95-100 = crystal clear, 85-94 = clearly visible, 75-84 = mostly clear, 60-74 = some uncertainty, below 60 = poor image quality
5. Image Quality: good, poor, or unreadable

Always return valid numbers for total_price and prices. If a field cannot be determined, use sensible defaults.`,
          },
          {
            type: "image",
            image: imageDataUrl,
          },
        ],
      },
    ]

    const { object } = await generateObject({
      model: "openai/gpt-5-mini",
      schema: receiptResultSchema,
      messages,
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

    const messages: ModelMessage[] = [
      {
        role: "user",
        content: `Please extract receipt data from this OCR text:

${ocrText}`,
      },
    ]

    const { object } = await generateObject({
  model: openai("gpt-5-mini"),
  schema: receiptResultSchema,
  system: `You are an expert at extracting structured data from receipt text. Parse OCR-extracted receipt text and extract the total price, vendor name, and all items purchased.

CRITICAL EXTRACTION RULES:
1. Total Price: Extract ONLY the final "Total" line - never use subtotals, taxes, or discounts. Must be a valid number.
2. Vendor Name: The business/store name typically at the top. If not found, return empty string.
3. Items: Extract all line items with quantities and prices when available.
4. Confidence: Rate 0-100 where 95-100 = crystal clear, 85-94 = clearly visible, 75-84 = mostly clear, 60-74 = some uncertainty, below 60 = poor OCR quality
5. Image Quality: Assess based on OCR text clarity - good if clear and complete, poor if some text is garbled, unreadable if mostly illegible.

Always return valid numbers for total_price and prices. If a field cannot be determined, use sensible defaults.`,
  messages,
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
    error:
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : `Unknown error: ${String(error)}`,
  }
}
}