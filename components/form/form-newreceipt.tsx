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
}

interface ReceiptQualityAssessment {
  confidencePercentage: number
  imageQuality: "good" | "poor" | "unreadable"
  uncertainFields?: string[]
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
    items: Array<{ name: string; quantity?: number | null; price?: number | null }>
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
    }))
    .filter((item) => item.name || item.price > 0)
}

function getItemTotal(items: ReceiptItem[]) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 1)
    const price = Number(item.price || 0)

    return sum + quantity * price
  }, 0)
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

  const cleanItems = useMemo(() => normalizeReceiptItems(itemsPurchased), [itemsPurchased])
  const itemTotal = useMemo(() => getItemTotal(itemsPurchased), [itemsPurchased])

  const canSubmit = useMemo(() => {
    if (viewMode || loading || analyzingReceipt) return false
    if (!selectedProject) return false

    const parsedTotal = Number.parseFloat(totalPrice)

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

        setProjects(data || [])
      } catch (err) {
        console.error("[FormNewReceipt] Unexpected project fetch error:", err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchUserProjects()
  }, [userId, viewMode])

  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id)
    }
  }, [projects, selectedProject])

  useEffect(() => {
    if (!viewMode || !initialData) return

    setTotalPrice(initialData.totalPrice || "")
    setSelectedProject(initialData.project || "")
    setProjectName(initialData.projectName || "Unknown Project")
    setNotes(initialData.notes || "")
    setItemsPurchased(initialData.items || [])
    setCategory(initialData.category || "")
    setVendorName(initialData.vendorName || "")
  }, [initialData, viewMode])

  const resetFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  const resetForm = () => {
    setSelectedFiles([])
    setSelectedProject(projects[0]?.id || "")
    setProjectName("")
    setCategory("")
    setVendorName("")
    setNotes("")
    setTotalPrice("")
    setItemsPurchased([])
    setQualityAssessment(null)
    setError(null)
    resetFileInputs()
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(",")[1] || "")
      }

      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const getOptimizedImageBase64 = async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      return fileToBase64(file)
    }

    const maxSize = 1600
    const quality = 0.82
    const imageUrl = URL.createObjectURL(file)

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = imageUrl
      })

      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const width = Math.round(image.width * scale)
      const height = Math.round(image.height * scale)

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext("2d")

      if (!context) {
        return fileToBase64(file)
      }

      context.drawImage(image, 0, 0, width, height)

      const dataUrl = canvas.toDataURL("image/jpeg", quality)

      return dataUrl.split(",")[1] || ""
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  const clearFailedReceiptFile = () => {
    setSelectedFiles([])
    resetFileInputs()
  }

  const analyzeReceiptImage = async (file: File) => {
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

      const response = await fetch("/api/analyze-receipt-fast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/jpeg",
        }),
      })

      const result = await response.json()

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
        setTotalPrice(String(result.data.total_cost))
      }

      if (Array.isArray(result.data.items)) {
        setItemsPurchased(
          result.data.items.map((item: ReceiptItem) => ({
            name: item.name || "",
            quantity: item.quantity || undefined,
            price: item.price || undefined,
          })),
        )
      }

      if (result.data.category) {
        setCategory(result.data.category)
      }

      if (result.data.vendor_name || result.data.merchant) {
        setVendorName(result.data.vendor_name || result.data.merchant)
      }

      if (result.data.project_name) {
        setProjectName(result.data.project_name)
      }
    } catch (err) {
      console.error("[FormNewReceipt] Error analyzing receipt:", err)
      setError(err instanceof Error ? err.message : "Failed to analyze receipt. Please try again.")
      clearFailedReceiptFile()
    } finally {
      setAnalyzingReceipt(false)
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
      setError("Please select a project.")
      return
    }

    const receiptTotal = Number.parseFloat(totalPrice)

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
        itemTotal={itemTotal}
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
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pb-4 sm:space-y-4">
          {error ? <AlertCard title="Receipt issue" message={error} tone="error" /> : null}

          {analyzingReceipt ? (
            <AlertCard
              title="Analyzing receipt"
              message="Reading receipt image with faster server-side AI extraction..."
              tone="info"
              loading
            />
          ) : null}

          {qualityAssessment && qualityAssessment.confidencePercentage >= 60 ? (
            <AlertCard
              title="Receipt analyzed"
              message={`Extracted with ${qualityAssessment.confidencePercentage}% confidence.`}
              tone="success"
            />
          ) : null}

          <FormSection
            icon={<Receipt className="h-4 w-4 text-zinc-300" />}
            title="Receipt capture"
            description="Upload a receipt or take a photo. Images are resized for fast AI extraction, then saved to Cloudflare R2."
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
            description="Confirm the project, vendor, category, and total before submitting."
            rightSlot={
              itemTotal > 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2 text-left sm:text-right">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Item total</div>
                  <div className="text-sm font-semibold text-zinc-100">{formatMoney(itemTotal)}</div>
                </div>
              ) : null
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project">
                <Select value={selectedProject} onValueChange={setSelectedProject} disabled={loading || loadingProjects}>
                  <SelectTrigger className="h-11 rounded-xl border-zinc-800 bg-black text-sm sm:h-10">
                    <SelectValue placeholder={loadingProjects ? "Loading..." : "Select project"} />
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
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalPrice}
                    onChange={(event) => setTotalPrice(event.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-black pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700 sm:h-10"
                    disabled={loading || analyzingReceipt}
                  />
                </div>

                {itemTotal > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-0 text-xs text-zinc-400 hover:text-zinc-100"
                    onClick={() => setTotalPrice(itemTotal.toFixed(2))}
                    disabled={loading}
                  >
                    Use item total: {formatMoney(itemTotal)}
                  </Button>
                ) : null}
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
            </div>
          </FormSection>

          <FormSection
            title="Items purchased"
            description="AI extracted items stay inside this scroll box so the form does not stretch off screen."
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
              <div className="max-h-[260px] space-y-2 overflow-y-auto overscroll-contain pr-1">
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
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity || ""}
                          onChange={(event) =>
                            updateItem(index, {
                              quantity: event.target.value ? Number(event.target.value) : undefined,
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
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price || ""}
                            onChange={(event) =>
                              updateItem(index, {
                                price: event.target.value ? Number.parseFloat(event.target.value) : undefined,
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

function ReceiptView({
  category,
  initialData,
  itemTotal,
  itemsPurchased,
  notes,
  onCancel,
  projectName,
  totalPrice,
  vendorName,
}: {
  category: string
  initialData?: FormNewReceiptProps["initialData"]
  itemTotal: number
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
            {itemTotal > 0 ? (
              <span className="text-xs font-medium text-zinc-400">{formatMoney(itemTotal)}</span>
            ) : null}
          </div>

          {itemsPurchased.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-black p-4 text-center text-sm text-zinc-500">
              No receipt items saved.
            </div>
          ) : (
            <div className="max-h-[260px] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {itemsPurchased.map((item, index) => (
                <div key={index} className="rounded-xl border border-zinc-800 bg-black p-3">
                  <div className="text-sm font-medium text-zinc-100">{item.name || "Unnamed item"}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Qty {item.quantity || 1} • {formatMoney(Number(item.price || 0))}
                  </div>
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
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
            ) : null}
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

