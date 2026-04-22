import { useState, useEffect, useCallback } from 'react'
import type { PdfMarkup as Markup } from '@/lib/pdf-viewer-types'

interface UsePDFMarkupsOptions {
  pdfFileId?: string
  pageNumber?: number
  autoSave?: boolean
}

export function usePDFMarkups(options: UsePDFMarkupsOptions = {}) {
  const { pdfFileId, pageNumber, autoSave = true } = options
  const [markups, setMarkups] = useState<Markup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load markups from database or localStorage
  useEffect(() => {
    const loadMarkups = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (pdfFileId) {
          // Load from database
          const params = new URLSearchParams({ pdfFileId })
          if (pageNumber !== undefined) {
            params.append('pageNumber', pageNumber.toString())
          }

          const response = await fetch(`/api/pdf-markups?${params}`)
          if (!response.ok) {
            throw new Error('Failed to load markups')
          }

          const data = await response.json()
          setMarkups(data.map((item: any) => item.markup_data))
        } else {
          // Load from localStorage (demo mode)
          const saved = localStorage.getItem('pdf_markups')
          if (saved) {
            setMarkups(JSON.parse(saved))
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load markups'
        setError(message)
        console.error('[v0] Error loading markups:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadMarkups()
  }, [pdfFileId, pageNumber])

  // Auto-save markups
  useEffect(() => {
    if (!autoSave) return

    const saveTimer = setTimeout(async () => {
      if (pdfFileId) {
        await saveMarkupsToDatabase(markups, pdfFileId)
      } else {
        // Save to localStorage
        localStorage.setItem('pdf_markups', JSON.stringify(markups))
      }
    }, 1000) // Debounce saves by 1 second

    return () => clearTimeout(saveTimer)
  }, [markups, pdfFileId, autoSave])

  const saveMarkupsToDatabase = useCallback(
    async (markupsToSave: Markup[], fileId: string) => {
      setIsSaving(true)
      setError(null)

      try {
        const response = await fetch('/api/pdf-markups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfFileId: fileId,
            markups: markupsToSave,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save markups')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save markups'
        setError(message)
        console.error('[v0] Error saving markups:', err)
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  const updateMarkups = useCallback((newMarkups: Markup[]) => {
    setMarkups(newMarkups)
  }, [])

  const clearMarkups = useCallback(async () => {
    setMarkups([])
    if (pdfFileId) {
      await saveMarkupsToDatabase([], pdfFileId)
    } else {
      localStorage.removeItem('pdf_markups')
    }
  }, [pdfFileId, saveMarkupsToDatabase])

  return {
    markups,
    updateMarkups,
    clearMarkups,
    isLoading,
    isSaving,
    error,
    saveMarkupsToDatabase,
  }
}
