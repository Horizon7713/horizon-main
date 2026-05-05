import { NextResponse } from "next/server"

type Language = "en" | "es"

function buildTranslationPrompt({
  text,
  targetLanguage,
}: {
  text: string
  targetLanguage: Language
}) {
  const targetName = targetLanguage === "es" ? "Spanish" : "English"

  return [
    {
      role: "system",
      content:
        "You are a construction messaging translator. Translate the user's message accurately and naturally. Preserve construction terms, names, dates, addresses, measurements, prices, and tone. Return only the translated text. Do not add explanations.",
    },
    {
      role: "user",
      content: `Translate this message to ${targetName}:\n\n${text}`,
    },
  ]
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const text = String(body.text || "").trim()
    const targetLanguage = body.targetLanguage as Language

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Missing text" },
        { status: 400 },
      )
    }

    if (targetLanguage !== "en" && targetLanguage !== "es") {
      return NextResponse.json(
        { success: false, error: "Invalid target language" },
        { status: 400 },
      )
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing OPENAI_API_KEY" },
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
        messages: buildTranslationPrompt({ text, targetLanguage }),
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()

      return NextResponse.json(
        {
          success: false,
          error: errorText || "Translation request failed",
        },
        { status: 500 },
      )
    }

    const data = await response.json()
    const translatedText =
      data?.choices?.[0]?.message?.content?.trim() || text

    return NextResponse.json({
      success: true,
      translatedText,
    })
  } catch (error) {
    console.error("Message translation error:", error)

    return NextResponse.json(
      { success: false, error: "Failed to translate message" },
      { status: 500 },
    )
  }
}