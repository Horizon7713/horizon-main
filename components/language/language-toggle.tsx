"use client"

import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "./language-provider"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="inline-flex rounded-xl border border-zinc-800 bg-black p-1">
      <Button
        type="button"
        size="sm"
        onClick={() => setLanguage("en")}
        className={`h-8 rounded-lg px-3 text-xs ${
          language === "en"
            ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
            : "bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        }`}
      >
        <Languages className="mr-1.5 h-3.5 w-3.5" />
        EN
      </Button>

      <Button
        type="button"
        size="sm"
        onClick={() => setLanguage("es")}
        className={`h-8 rounded-lg px-3 text-xs ${
          language === "es"
            ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
            : "bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        }`}
      >
        ES
      </Button>
    </div>
  )
}