"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  DollarSign,
  File,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COST_CODES } from "@/lib/cost-codes"
import { supabase } from "@/lib/supabase/client"

interface Project {
  id: string
  name: string
  status: string
  company: string
  current_budget: number
}

interface ReceiptItem {
  name: string
  quantity?: number | null
  price?: number | null
  cost_code?: string | null
  cost_code_label?: string | null
  cost_code_full_path?: string | null
  cost_code_confirmed?: boolean
  cost_code_ai_reason?: string | null
  show_cost_code_picker?: boolean
}

interface ReceiptQualityAssessment {
  confidencePercentage: number
  imageQuality: "good" | "poor" | "unreadable"
  uncertainFields?: string[]
}

interface SuggestedCostCode {
  code?: string | null
  label?: string | null
  fullPath?: string | null
  confidence?: number | null
  reason?: string | null
}

interface R2SignResponse {
  uploadUrl?: string
  signedUrl?: string
  publicUrl?: string
  fileUrl?: string
  url?: string
  key?: string
  objectKey?: string
  contentType?: string
}

interface FormNewReceiptProps {
  userId: string
  receiverId: string
  onSuccess?: () => void
  onCancel?: () => void
  sendMessageAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>
  viewMode?: boolean
  initialData?: {
    totalPrice: string
    project: string
    projectName?: string
    notes: string
    items: ReceiptItem[]
    files: Array<{ url: string | null; mimeType: string | null }>
    category?: string
    vendorName?: string
  }
}

const RECEIPT_CATEGORIES = [
  { value: "lumber", label: "Lumber" },
  { value: "concrete", label: "Concrete" },
  { value: "finish", label: "Finish" },
  { value: "gas", label: "Gas" },
  { value: "framing", label: "Framing" },
  { value: "small_tool", label: "Small Tool" },
  { value: "equipment", label: "Equipment" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "other", label: "Other" },
]

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0)
}

function cleanMoneyInput(value: unknown) {
  if (value === null || value === undefined) return ""

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
    .trim()

  const parsed = Number.parseFloat(cleaned)

  if (!Number.isFinite(parsed)) return ""

  return parsed.toFixed(2)
}

function toOptionalNumber(value: unknown) {
  const cleaned = cleanMoneyInput(value)

  if (!cleaned) return undefined

  const parsed = Number(cleaned)

  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeDecimalText(value: string) {
  return value.replace(/,/g, "").replace(/[^0-9.-]/g, "")
}

function normalizeCardUsedInput(value: unknown) {
  const text = String(value || "").trim()

  if (!text) return ""

  const lower = text.toLowerCase()

  const badKeywords = [
    "auth",
    "approval",
    "appr",
    "transaction",
    "trans",
    "terminal",
    "term",
    "invoice",
    "order",
    "merchant",
    "store",
    "register",
    "reference",
    "ref",
  ]

  const cardKeywords = [
    "visa",
    "mastercard",
    "master card",
    "amex",
    "american express",
    "discover",
    "debit",
    "credit",
    "card",
    "acct",
    "account",
    "ending",
    "ends in",
    "last 4",
    "last four",
  ]

  const hasBadKeyword = badKeywords.some((keyword) => lower.includes(keyword))
  const hasCardKeyword = cardKeywords.some((keyword) => lower.includes(keyword))

  if (hasBadKeyword && !hasCardKeyword) return ""

  const maskedMatch = text.match(/(?:\*|x|X|•){2,}[\s-]*(\d{4})\b/)
  const endingMatch = text.match(/(?:ending|ends in|last\s*4|last\s*four|card)[^\d]*(\d{4})/i)
  const allFourDigitMatches = text.match(/\b\d{4}\b/g) || []

  const last4 =
    maskedMatch?.[1] ||
    endingMatch?.[1] ||
    (hasCardKeyword && allFourDigitMatches.length > 0
      ? allFourDigitMatches[allFourDigitMatches.length - 1]
      : allFourDigitMatches.length === 1 && !hasBadKeyword
        ? allFourDigitMatches[0]
        : "")

  if (!last4) return ""

  if (/visa/i.test(text)) return `Visa ${last4}`
  if (/mastercard|master card|\bmc\b/i.test(text)) return `Mastercard ${last4}`
  if (/amex|american express/i.test(text)) return `Amex ${last4}`
  if (/discover/i.test(text)) return `Discover ${last4}`
  if (/debit/i.test(text)) return `Debit ${last4}`
  if (/credit/i.test(text)) return `Credit card ${last4}`

  return `Card ending ${last4}`
}

function formatCategory(value: string) {
  const match = RECEIPT_CATEGORIES.find((category) => category.value === value)

  if (match) return match.label
  if (!value) return "No category"

  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ")
}

function getPublicR2Url(signResult: R2SignResponse) {
  return signResult.publicUrl || signResult.fileUrl || signResult.url || ""
}

function getUploadUrl(signResult: R2SignResponse) {
  return signResult.uploadUrl || signResult.signedUrl || ""
}

function getUploadMimeType(signResult: R2SignResponse, fallback: string) {
  return signResult.contentType || fallback || "application/octet-stream"
}

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function normalizeReceiptItems(items: ReceiptItem[]) {
  return items
    .map((item) => ({
      name: String(item.name || "").trim(),
      quantity: item.quantity ? Number(item.quantity) : 1,
      price: item.price ? Number(item.price) : 0,
      cost_code: item.cost_code || null,
      cost_code_label: item.cost_code_label || null,
      cost_code_full_path: item.cost_code_full_path || null,
      cost_code_confirmed: Boolean(item.cost_code_confirmed),
      cost_code_ai_reason: item.cost_code_ai_reason || null,
    }))
    .filter((item) => item.name || item.price > 0)
}

function getSuggestedCostCode(item: { suggested_cost_code?: SuggestedCostCode }) {
  const suggestedCode = item.suggested_cost_code || {}

  return {
    cost_code: suggestedCode.code || null,
    cost_code_label: suggestedCode.label || null,
    cost_code_full_path: suggestedCode.fullPath || null,
    cost_code_confirmed: false,
    cost_code_ai_reason: suggestedCode.reason || null,
    show_cost_code_picker: false,
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const dataUrl = String(reader.result || "")
      resolve(dataUrl.split(",")[1] || "")
    }

    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.72): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

async function loadImageForCanvas(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      })
    } catch {
      // Fall back to HTMLImageElement below.
    }
  }

  const imageUrl = URL.createObjectURL(file)

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = imageUrl
    })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export function FormNewReceipt({
  userId,
  receiverId,
  onSuccess,
  onCancel,
  sendMessageAction,
  viewMode = false,
  initialData,
}: FormNewReceiptProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [projectName, setProjectName] = useState("")
  const [category, setCategory] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [authCode, setAuthCode] = useState("")
  const [cardUsed, setCardUsed] = useState("")
  const [notes, setNotes] = useState("")
  const [totalPrice, setTotalPrice] = useState("")
  const [itemsPurchased, setItemsPurchased] = useState<ReceiptItem[]>([])
  const [qualityAssessment, setQualityAssessment] = useState<ReceiptQualityAssessment | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const analysisAbortRef = useRef<AbortController | null>(null)

  const cleanItems = useMemo(() => normalizeReceiptItems(itemsPurchased), [itemsPurchased])

  const canSubmit = useMemo(() => {
    if (viewMode || loading || analyzingReceipt) return false
    if (!selectedProject) return false

    const parsedTotal = Number.parseFloat(cleanMoneyInput(totalPrice))

    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) return false

    return (
      selectedFiles.length > 0 ||
      vendorName.trim().length > 0 ||
      notes.trim().length > 0 ||
      cleanItems.length > 0
    )
  }, [
    analyzingReceipt,
    cleanItems.length,
    loading,
    notes,
    selectedFiles.length,
    selectedProject,
    totalPrice,
    vendorName,
    viewMode,
  ])

  useEffect(() => {
    if (viewMode) {
      setLoadingProjects(false)
      return
    }

    let isMounted = true

    async function fetchUserProjects() {
      try {
        const { data: userProfile, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", userId)
          .single()

        if (userError || !userProfile) {
          console.error("[FormNewReceipt] User profile not found:", userError)
          return
        }

        const { data, error: projectsError } = await supabase
          .from("projects")
          .select("id, name, status, company, current_budget")
          .eq("status", "active")
          .contains("users", [userProfile.id])
          .order("name")

        if (projectsError) {
          console.error("[FormNewReceipt] Error fetching projects:", projectsError)
          return
        }

        if (isMounted) setProjects(data || [])
      } catch (err) {
        console.error("[FormNewReceipt] Unexpected project fetch error:", err)
      } finally {
        if (isMounted) setLoadingProjects(false)
      }
    }

    fetchUserProjects()

    return () => {
      isMounted = false
    }
  }, [userId, viewMode])

  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id)
      setProjectName(projects[0].name || "")
    }
  }, [projects, selectedProject])

  useEffect(() => {
    if (!viewMode || !initialData) return

    setTotalPrice(cleanMoneyInput(initialData.totalPrice || ""))
    setSelectedProject(initialData.project || "")
    setProjectName(initialData.projectName || "Unknown Project")
    setNotes(initialData.notes || "")
    setItemsPurchased(initialData.items || [])
    setCategory(initialData.category || "")
    setVendorName(initialData.vendorName || "")
  }, [initialData, viewMode])

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort()
    }
  }, [])

  const resetFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  const resetForm = () => {
    analysisAbortRef.current?.abort()
    setSelectedFiles([])
    setSelectedProject(projects[0]?.id || "")
    setProjectName(projects[0]?.name || "")
    setCategory("")
    setVendorName("")
    setAuthCode("")
    setCardUsed("")
    setNotes("")
    setTotalPrice("")
    setItemsPurchased([])
    setQualityAssessment(null)
    setError(null)
    resetFileInputs()
  }

  const getOptimizedImageBase64 = async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      return blobToBase64(file)
    }

    const maxSize = 1200
    const quality = 0.72
    const image = await loadImageForCanvas(file)

    try {
      const sourceWidth = "width" in image ? image.width : 0
      const sourceHeight = "height" in image ? image.height : 0

      if (!sourceWidth || !sourceHeight) {
        return blobToBase64(file)
      }

      const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight))
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext("2d", { alpha: false })

      if (!context) return blobToBase64(file)

      context.drawImage(image, 0, 0, width, height)

      const optimizedBlob = await canvasToBlob(canvas, "image/jpeg", quality)

      if (!optimizedBlob) return blobToBase64(file)

      return blobToBase64(optimizedBlob)
    } finally {
      if ("close" in image && typeof image.close === "function") {
        image.close()
      }
    }
  }

  const clearFailedReceiptFile = () => {
    setSelectedFiles([])
    resetFileInputs()
  }

  const analyzeReceiptImage = async (file: File) => {
    analysisAbortRef.current?.abort()

    const controller = new AbortController()
    analysisAbortRef.current = controller

    try {
      setAnalyzingReceipt(true)
      setError(null)
      setQualityAssessment(null)
      setTotalPrice("")
      setItemsPurchased([])

      if (!file.type.startsWith("image/")) {
        setError("Only receipt images can be analyzed automatically. PDFs can still be uploaded and entered manually.")
        return
      }

      const base64 = await getOptimizedImageBase64(file)

      if (controller.signal.aborted) return

      const response = await fetch("/api/analyze-receipt-fast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/jpeg",
        }),
        signal: controller.signal,
      })

      const result = await response.json()
      console.log("[Receipt AI Result]", result)

      if (controller.signal.aborted) return

      if (!response.ok || !result.success || !result.data) {
        setError(String(result.error || "Could not automatically extract data from receipt."))
        clearFailedReceiptFile()
        return
      }

      const confidencePercentage = Number(result.data.confidencePercentage || 0)
      const imageQuality = result.data.imageQuality || "poor"

      setQualityAssessment({
        confidencePercentage,
        imageQuality,
        uncertainFields: Array.isArray(result.data.uncertainFields) ? result.data.uncertainFields : [],
      })

      if (imageQuality === "unreadable" || confidencePercentage < 60) {
        setError(
          `Receipt image quality is too low (${confidencePercentage}% confidence). Please take a clearer photo with better lighting and focus.`,
        )
        clearFailedReceiptFile()
        return
      }

      if (result.data.total_cost !== null && result.data.total_cost !== undefined) {
        setTotalPrice(cleanMoneyInput(result.data.total_cost))
      }

      if (Array.isArray(result.data.items)) {
        setItemsPurchased(
          result.data.items.slice(0, 8).map((item: ReceiptItem & { suggested_cost_code?: SuggestedCostCode }) => {
            const suggested = getSuggestedCostCode(item)

            return {
              name: item.name || "",
              quantity: item.quantity ? Number(item.quantity) : undefined,
              price: toOptionalNumber(item.price),
              ...suggested,
              show_cost_code_picker: !suggested.cost_code,
            }
          }),
        )
      }

      if (result.data.category) {
        setCategory(result.data.category)
      }

      if (result.data.vendor_name || result.data.merchant) {
        setVendorName(result.data.vendor_name || result.data.merchant)
      }

      if (result.data.auth_code) {
        setAuthCode(result.data.auth_code)
      }

      const normalizedCardUsed = normalizeCardUsedInput(result.data.card_used)
      setCardUsed(normalizedCardUsed)

      if (result.data.project_name) {
        setProjectName(result.data.project_name)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return

      console.error("[FormNewReceipt] Error analyzing receipt:", err)
      setError(err instanceof Error ? err.message : "Failed to analyze receipt. Please try again.")
      clearFailedReceiptFile()
    } finally {
      if (analysisAbortRef.current === controller) {
        setAnalyzingReceipt(false)
        analysisAbortRef.current = null
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) return

    setError(null)

    setSelectedFiles((previous) => {
      const existingKeys = new Set(previous.map(getFileKey))
      const newUniqueFiles = files.filter((file) => !existingKeys.has(getFileKey(file)))

      return [...previous, ...newUniqueFiles]
    })

    const firstImageFile = files.find((file) => file.type.startsWith("image/"))

    if (firstImageFile) {
      analyzeReceiptImage(firstImageFile)
    }

    event.target.value = ""
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
    resetFileInputs()
  }

  const addItem = () => {
    setItemsPurchased((previous) => [
      ...previous,
      {
        name: "",
        quantity: 1,
        price: undefined,
        cost_code: null,
        cost_code_label: null,
        cost_code_full_path: null,
        cost_code_confirmed: false,
        cost_code_ai_reason: null,
        show_cost_code_picker: true,
      },
    ])
  }

  const updateItem = (index: number, patch: Partial<ReceiptItem>) => {
    setItemsPurchased((previous) => {
      const updated = [...previous]

      updated[index] = {
        ...updated[index],
        ...patch,
      }

      return updated
    })
  }

  const confirmItemCostCode = (index: number) => {
    updateItem(index, {
      cost_code_confirmed: true,
      show_cost_code_picker: false,
    })
  }

  const rejectItemCostCode = (index: number) => {
    updateItem(index, {
      cost_code: null,
      cost_code_label: null,
      cost_code_full_path: null,
      cost_code_confirmed: false,
      cost_code_ai_reason: null,
      show_cost_code_picker: true,
    })
  }

  const selectItemCostCode = (index: number, selectedValue: string) => {
    const selectedCode =
      COST_CODES.find((costCode) => costCode.fullPath === selectedValue) ||
      COST_CODES.find((costCode) => costCode.code === selectedValue)

    if (!selectedCode) return

    updateItem(index, {
      cost_code: selectedCode.code,
      cost_code_label: selectedCode.label,
      cost_code_full_path: selectedCode.fullPath,
      cost_code_confirmed: true,
      cost_code_ai_reason: "Selected manually.",
      show_cost_code_picker: false,
    })
  }

  const removeItem = (index: number) => {
    setItemsPurchased((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
  }

  const getR2SignedUpload = async (file: File) => {
    const response = await fetch("/api/uploads/r2/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        mimeType: file.type || "application/octet-stream",
        folder: "receipts",
        type: "receipt",
        projectId: selectedProject || null,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      throw new Error(result.error || `Failed to create Cloudflare R2 upload URL for ${file.name}`)
    }

    const uploadUrl = getUploadUrl(result)
    const publicUrl = getPublicR2Url(result)

    if (!uploadUrl) {
      throw new Error("Cloudflare R2 signing response did not include uploadUrl or signedUrl.")
    }

    if (!publicUrl) {
      throw new Error("Cloudflare R2 signing response did not include publicUrl, fileUrl, or url.")
    }

    return result as R2SignResponse
  }

  const uploadReceiptFilesToR2 = async () => {
    const uploadedFiles: Array<{ url: string; mimeType: string }> = []
    const uniqueFiles = selectedFiles.filter(
      (file, index, array) =>
        index === array.findIndex((otherFile) => getFileKey(otherFile) === getFileKey(file)),
    )

    for (const file of uniqueFiles) {
      const signResult = await getR2SignedUpload(file)
      const uploadUrl = getUploadUrl(signResult)
      const publicUrl = getPublicR2Url(signResult)
      const contentType = file.type || "application/octet-stream"

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
        mode: "cors",
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload ${file.name} to Cloudflare R2.`)
      }

      uploadedFiles.push({
        url: publicUrl,
        mimeType: getUploadMimeType(signResult, contentType),
      })
    }

    return uploadedFiles
  }

  const updateProjectBudget = async (receiptTotal: number) => {
    try {
      const { data: projectData, error: fetchError } = await supabase
        .from("projects")
        .select("current_budget")
        .eq("id", selectedProject)
        .single()

      if (fetchError || !projectData) {
        console.error("[FormNewReceipt] Error fetching project budget:", fetchError)
        return
      }

      const currentBudget = Number(projectData.current_budget || 0)
      const newBudget = currentBudget - receiptTotal

      const { error: updateError } = await supabase
        .from("projects")
        .update({ current_budget: newBudget })
        .eq("id", selectedProject)

      if (updateError) {
        console.error("[FormNewReceipt] Error updating project budget:", updateError)
      }
    } catch (err) {
      console.error("[FormNewReceipt] Error updating project budget:", err)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedProject) {
      setError("Please select a job/project.")
      return
    }

    const receiptTotal = Number.parseFloat(cleanMoneyInput(totalPrice))

    if (!Number.isFinite(receiptTotal) || receiptTotal <= 0) {
      setError("Please enter a valid total price.")
      return
    }

    if (selectedFiles.length === 0 && !vendorName.trim() && !notes.trim() && cleanItems.length === 0) {
      setError("Please upload a receipt, enter a vendor, add notes, or add at least one item.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const bundleId = crypto.randomUUID()
      const uploadedFileData = await uploadReceiptFilesToR2()
      const messageContent = notes.trim() || `Receipt submitted for ${formatMoney(receiptTotal)}`
      const normalizedCardUsed = normalizeCardUsedInput(cardUsed) || cardUsed.trim()

      const formData = new FormData()
      formData.append("content", messageContent)
      formData.append("fileData", JSON.stringify(uploadedFileData))
      formData.append("bundleId", bundleId)
      formData.append("userId", userId)
      formData.append("receiverId", receiverId)
      formData.append("currentProject", selectedProject)
      formData.append("messageType", "receipt")
      formData.append("totalPrice", receiptTotal.toFixed(2))
      formData.append("itemsPurchased", JSON.stringify(cleanItems))
      formData.append("category", category)
      formData.append("vendorName", vendorName.trim())
      formData.append("authCode", authCode.trim())
      formData.append("cardUsed", normalizedCardUsed)

      const result = await sendMessageAction(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      await updateProjectBudget(receiptTotal)

      resetForm()
      onSuccess?.()
    } catch (err) {
      console.error("[FormNewReceipt] Error submitting receipt:", err)
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (viewMode) {
    return (
      <ReceiptView
        category={category}
        initialData={initialData}
        itemsPurchased={itemsPurchased}
        notes={notes}
        onCancel={onCancel}
        projectName={projectName}
        totalPrice={totalPrice}
        vendorName={vendorName}
      />
    )
  }

  return (
    <div className="mx-auto flex h-[min(760px,calc(100dvh-120px))] w-full max-w-3xl flex-col overflow-hidden px-1 sm:px-0">
      <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pb-4 sm:space-y-4">
          {error ? <AlertCard title="Receipt issue" message={error} tone="error" /> : null}

          {analyzingReceipt ? (
            <AlertCard
              title="Analyzing receipt"
              message="Reading receipt image and filling the receipt fields..."
              tone="info"
              loading
            />
          ) : null}

          {qualityAssessment && qualityAssessment.confidencePercentage >= 60 ? (
            <AlertCard
              title="Receipt analyzed"
              message={`Extracted with ${qualityAssessment.confidencePercentage}% confidence. Review the receipt before submitting.`}
              tone="success"
            />
          ) : null}

          <FormSection
            icon={<Receipt className="h-4 w-4 text-zinc-300" />}
            title="Receipt capture"
            description="Upload a receipt or take a photo. Images are compressed for fast AI extraction, then the original file is saved to Cloudflare R2 when submitted."
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-900 sm:h-10"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload receipt
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-900 sm:h-10"
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
              >
                <Camera className="mr-2 h-4 w-4" />
                Take photo
              </Button>
            </div>

            {selectedFiles.length > 0 ? (
              <div className="mt-3 max-h-24 space-y-2 overflow-y-auto pr-1">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${getFileKey(file)}-${index}`}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-300"
                  >
                    <File className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-zinc-500 hover:text-zinc-100"
                      onClick={() => handleRemoveFile(index)}
                      disabled={loading}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </FormSection>

          <FormSection
            title="Receipt details"
            description="Assign this receipt to a job/project, then confirm the vendor, category, and final receipt total."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Job / Project">
                <Select
                  value={selectedProject}
                  onValueChange={(value) => {
                    setSelectedProject(value)

                    const selected = projects.find((project) => project.id === value)
                    setProjectName(selected?.name || "")
                  }}
                  disabled={loading || loadingProjects}
                >
                  <SelectTrigger className="h-11 rounded-xl border-zinc-800 bg-black text-sm sm:h-10">
                    <SelectValue placeholder={loadingProjects ? "Loading jobs..." : "Select job/project"} />
                  </SelectTrigger>

                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Total price">
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={totalPrice}
                    onChange={(event) => setTotalPrice(normalizeDecimalText(event.target.value))}
                    onBlur={(event) => setTotalPrice(cleanMoneyInput(event.target.value) || event.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-black pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-10"
                    disabled={loading || analyzingReceipt}
                  />
                </div>
              </Field>

              <Field label="Category">
                <Select value={category} onValueChange={setCategory} disabled={loading}>
                  <SelectTrigger className="h-11 rounded-xl border-zinc-800 bg-black text-sm sm:h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECEIPT_CATEGORIES.map((receiptCategory) => (
                      <SelectItem key={receiptCategory.value} value={receiptCategory.value}>
                        {receiptCategory.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Vendor name">
                <input
                  type="text"
                  value={vendorName}
                  onChange={(event) => setVendorName(event.target.value)}
                  placeholder="e.g., Home Depot"
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-10"
                  disabled={loading || analyzingReceipt}
                />
              </Field>

              <Field label="Auth code">
                <input
                  type="text"
                  value={authCode}
                  onChange={(event) => setAuthCode(event.target.value)}
                  placeholder="e.g., 123456"
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-10"
                  disabled={loading || analyzingReceipt}
                />
              </Field>

              <Field label="Card used">
                <input
                  type="text"
                  value={cardUsed}
                  onChange={(event) => setCardUsed(event.target.value)}
                  onBlur={(event) => setCardUsed(normalizeCardUsedInput(event.target.value) || event.target.value)}
                  placeholder="e.g., Visa 1234"
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-10"
                  disabled={loading || analyzingReceipt}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Items purchased"
            description="Review the main extracted items. Item totals are not used as the receipt total."
            rightSlot={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 border-zinc-800 bg-black text-xs text-zinc-300 hover:bg-zinc-900"
                onClick={addItem}
                disabled={loading || analyzingReceipt}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add item
              </Button>
            }
          >
            {itemsPurchased.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-black px-4 py-6 text-center text-sm text-zinc-500">
                No receipt items added.
              </div>
            ) : (
              <div className="max-h-[300px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {itemsPurchased.map((item, index) => (
                  <div key={index} className="rounded-xl border border-zinc-800 bg-black p-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px_120px_auto] sm:gap-2">
                      <Field label="Item">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => updateItem(index, { name: event.target.value })}
                          placeholder="Item name"
                          className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-9"
                          disabled={loading || analyzingReceipt}
                        />
                      </Field>

                      <Field label="Qty">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.quantity || ""}
                          onChange={(event) =>
                            updateItem(index, {
                              quantity: event.target.value
                                ? Number.parseFloat(normalizeDecimalText(event.target.value))
                                : undefined,
                            })
                          }
                          placeholder="1"
                          className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-9"
                          disabled={loading || analyzingReceipt}
                        />
                      </Field>

                      <Field label="Price">
                        <div className="relative">
                          <DollarSign className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.price || ""}
                            onChange={(event) =>
                              updateItem(index, {
                                price: event.target.value ? Number.parseFloat(cleanMoneyInput(event.target.value)) : undefined,
                              })
                            }
                            placeholder="0.00"
                            className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-7 pr-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-9"
                            disabled={loading || analyzingReceipt}
                          />
                        </div>
                      </Field>

                      <div className="flex items-end justify-end sm:justify-start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-full text-zinc-500 hover:bg-red-500/10 hover:text-red-300 sm:h-9 sm:w-9"
                          onClick={() => removeItem(index)}
                          disabled={loading || analyzingReceipt}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <ItemCostCodeReview
                      disabled={loading || analyzingReceipt}
                      item={item}
                      index={index}
                      onConfirm={confirmItemCostCode}
                      onReject={rejectItemCostCode}
                      onSelect={selectItemCostCode}
                      onOpenPicker={(itemIndex) => updateItem(itemIndex, { show_cost_code_picker: true })}
                    />
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection title="Message">
            <Textarea
              id="receipt-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any notes about this receipt..."
              rows={3}
              className="rounded-xl border-zinc-800 bg-black text-sm text-zinc-100 placeholder:text-zinc-500"
              disabled={loading}
            />
          </FormSection>
        </div>

        <div className="shrink-0 border-t border-zinc-800 bg-black/95 p-3 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading || analyzingReceipt}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            ) : null}

            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : analyzingReceipt ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Submit receipt"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ItemCostCodeReview({
  disabled,
  item,
  index,
  onConfirm,
  onReject,
  onSelect,
  onOpenPicker,
}: {
  disabled: boolean
  item: ReceiptItem
  index: number
  onConfirm: (index: number) => void
  onReject: (index: number) => void
  onSelect: (index: number, code: string) => void
  onOpenPicker: (index: number) => void
}) {
  if (item.show_cost_code_picker) {
    return (
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="mb-2 text-xs font-semibold text-zinc-300">Choose cost code for this item</div>

        <Select value={item.cost_code_full_path || ""} onValueChange={(value) => onSelect(index, value)} disabled={disabled}>
          <SelectTrigger className="h-11 rounded-xl border-zinc-800 bg-black text-sm sm:h-10">
            <SelectValue placeholder="Search/select a cost code" />
          </SelectTrigger>

          <SelectContent className="max-h-80">
            {COST_CODES.map((costCode, costCodeIndex) => (
              <SelectItem
                key={`${costCode.code}-${costCodeIndex}-${costCode.fullPath}`}
                value={costCode.fullPath}
              >
                {costCode.code} — {costCode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (!item.cost_code) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-zinc-300">No cost code selected</div>
            <div className="mt-1 text-xs text-zinc-500">Choose one before submitting if this item needs job costing.</div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-zinc-800 bg-black text-xs text-zinc-300 hover:bg-zinc-900 sm:w-auto"
            onClick={() => onOpenPicker(index)}
            disabled={disabled}
          >
            Choose code
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mt-3 rounded-xl border p-3 text-xs ${
        item.cost_code_confirmed
          ? "border-green-500/20 bg-green-500/10 text-green-100"
          : "border-blue-500/20 bg-blue-500/10 text-blue-100"
      }`}
    >
      <div className="font-semibold">{item.cost_code_confirmed ? "Confirmed cost code" : "AI suggested cost code"}</div>

      <div className="mt-1 text-sm font-semibold text-zinc-100">
        {item.cost_code} — {item.cost_code_label || "Cost code"}
      </div>

      {item.cost_code_full_path ? <div className="mt-1 text-xs opacity-80">{item.cost_code_full_path}</div> : null}

      {item.cost_code_ai_reason ? <div className="mt-2 text-xs opacity-80">{item.cost_code_ai_reason}</div> : null}

      {!item.cost_code_confirmed ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button type="button" size="sm" className="w-full sm:w-auto" onClick={() => onConfirm(index)} disabled={disabled}>
            Yes, use this code
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onReject(index)}
            disabled={disabled}
          >
            No, choose another
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-green-200">Confirmed</span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full border-green-500/20 bg-black/20 text-xs sm:w-auto"
            onClick={() => onOpenPicker(index)}
            disabled={disabled}
          >
            Change code
          </Button>
        </div>
      )}
    </div>
  )
}

function ReceiptView({
  category,
  initialData,
  itemsPurchased,
  notes,
  onCancel,
  projectName,
  totalPrice,
  vendorName,
}: {
  category: string
  initialData?: FormNewReceiptProps["initialData"]
  itemsPurchased: ReceiptItem[]
  notes: string
  onCancel?: () => void
  projectName: string
  totalPrice: string
  vendorName: string
}) {
  return (
    <div className="mx-auto flex max-h-[calc(100dvh-120px)] w-full max-w-3xl flex-col overflow-hidden px-1 sm:px-0">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 pb-4">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-black">
              <Receipt className="h-4 w-4 text-zinc-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Receipt details</h3>
              <p className="mt-1 text-xs text-zinc-500">Review saved receipt information.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Project" value={projectName || "No project"} />
            <Detail label="Total" value={formatMoney(Number.parseFloat(totalPrice || "0"))} />
            <Detail label="Category" value={formatCategory(category)} />
            <Detail label="Vendor" value={vendorName || "No vendor"} />
          </div>

          {notes ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-3">
              <div className="text-xs font-medium text-zinc-500">Message</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{notes}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-100">Items purchased</h3>
          </div>

          {itemsPurchased.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-black p-4 text-center text-sm text-zinc-500">
              No receipt items saved.
            </div>
          ) : (
            <div className="max-h-[300px] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {itemsPurchased.map((item, index) => (
                <div key={index} className="rounded-xl border border-zinc-800 bg-black p-3">
                  <div className="text-sm font-medium text-zinc-100">{item.name || "Unnamed item"}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Qty {item.quantity || 1} • {formatMoney(Number(item.price || 0))}
                  </div>

                  {item.cost_code ? (
                    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                      <div className="text-xs font-semibold text-zinc-300">
                        {item.cost_code} — {item.cost_code_label || "Cost code"}
                      </div>
                      {item.cost_code_full_path ? (
                        <div className="mt-1 text-xs text-zinc-500">{item.cost_code_full_path}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {initialData?.files?.length ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-100">Receipt files</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {initialData.files.map((file, index) => {
                if (!file.url) return null

                const isImage = file.mimeType?.startsWith("image/")
                const fileName = file.url.split("/").pop() || "receipt-file"

                return (
                  <a
                    key={`${file.url}-${index}`}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={fileName}
                    className="block overflow-hidden rounded-xl border border-zinc-800 bg-black text-sm text-zinc-300 hover:bg-zinc-900"
                  >
                    {isImage ? (
                      <img src={file.url} alt="Receipt" className="max-h-64 w-full object-contain" />
                    ) : (
                      <div className="flex items-center gap-2 p-3">
                        <File className="h-4 w-4" />
                        <span className="min-w-0 flex-1 truncate">{fileName}</span>
                        <span className="text-xs text-zinc-500">Open</span>
                      </div>
                    )}
                  </a>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-zinc-800 bg-black/95 p-3 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4">
        <div className="flex justify-end">
          <Button type="button" onClick={onCancel} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function FormSection({
  children,
  description,
  icon,
  rightSlot,
  title,
}: {
  children: React.ReactNode
  description?: string
  icon?: React.ReactNode
  rightSlot?: React.ReactNode
  title: string
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-black">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            {description ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p> : null}
          </div>
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-300">{label}</Label>
      {children}
    </div>
  )
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-3">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  )
}

function AlertCard({
  title,
  message,
  tone,
  loading = false,
}: {
  title: string
  message: string
  tone: "error" | "info" | "success"
  loading?: boolean
}) {
  const toneClass =
    tone === "error"
      ? "border-red-500/20 bg-red-500/10 text-red-200"
      : tone === "success"
        ? "border-green-500/20 bg-green-500/10 text-green-200"
        : "border-blue-500/20 bg-blue-500/10 text-blue-200"

  const Icon = loading ? Loader2 : tone === "success" ? CheckCircle2 : AlertTriangle

  return (
    <div className={`rounded-xl border p-3 text-sm ${toneClass}`}>
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-80">{message}</p>
        </div>
      </div>
    </div>
  )
}


