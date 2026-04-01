"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export function useSignedStorageUrl(
  path?: string | null,
  bucket: string = "receipts",
  expiresIn: number = 3600
) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }

    // Already public URL
    if (path.startsWith("http")) {
      setUrl(path)
      return
    }

    let cancelled = false

    const generateUrl = async () => {
      setLoading(true)

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (!cancelled) {
        if (error) {
          console.error("[useSignedStorageUrl]", error)
          setUrl(null)
        } else {
          setUrl(data?.signedUrl ?? null)
        }
        setLoading(false)
      }
    }

    generateUrl()

    return () => {
      cancelled = true
    }
  }, [path, bucket, expiresIn])

  return { url, loading }
}
