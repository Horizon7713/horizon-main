import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { pdfUrl, title, description } = await request.json()

    if (!pdfUrl) {
      return new Response("PDF URL is required", { status: 400 })
    }

    // TODO: Replace with your actual XAI_API_KEY from https://console.x.ai
    const xaiApiKey = process.env.XAI_API_KEY

    const prompt = `Analyze this construction bid document and provide a detailed summary including:
1. Key deliverables and scope of work
2. Timeline and milestones
3. Cost breakdown if available
4. Any special terms or conditions
5. Potential risks or concerns

Bid Title: ${title || "Not provided"}
Description: ${description || "Not provided"}
PDF URL: ${pdfUrl}

Please provide a comprehensive analysis that would help a contractor evaluate this bid.`

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2",
        messages: [
          {
            role: "system",
            content:
              "You are an expert construction project analyst. Analyze bid documents and provide detailed, actionable insights for contractors.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`xAI API error: ${response.statusText}`)
    }

    return response
  } catch (error) {
    console.error("[v0] Error analyzing bid:", error)
    return new Response("Failed to analyze bid", { status: 500 })
  }
}
