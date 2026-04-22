"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { File, X, Upload, Camera, AlertTriangle, Edit3 } from 'lucide-react'
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
  quantity?: number
  price?: number
}

interface ReceiptQualityAssessment {
  confidencePercentage: number
  imageQuality: "good" | "poor" | "unreadable"
  uncertainFields?: string[]
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
    items: Array<{ name: string; quantity?: number; price?: number }>
    files: Array<{ url: string | null; mimeType: string | null }>
    category?: string
    vendorName?: string
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
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [projectName, setProjectName] = useState<string>("")
  const [category, setCategory] = useState<string>("")
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
  const [showManualInputDialog, setShowManualInputDialog] = useState(false)
  const [manualReceiptImage, setManualReceiptImage] = useState<File | null>(null)
  const [manualReceiptImagePreview, setManualReceiptImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const manualImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (viewMode) {
      setLoadingProjects(false)
      return
    }

    const fetchUserProjects = async () => {
      try {
        // Get current user's profile ID
        const { data: userProfile } = await supabase.from("users").select("id").eq("auth_id", userId).single()

        if (!userProfile) {
          console.error("[v0] User profile not found")
          setLoadingProjects(false)
          return
        }

        // Fetch projects where user is assigned
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, status, company, current_budget")
          .eq("status", "active")
          .contains("users", [userProfile.id])
          .order("name")

        if (error) {
          console.error("[v0] Error fetching projects:", error)
        } else {
          setProjects(data || [])
        }
      } catch (err) {
        console.error("[v0] Error fetching projects:", err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchUserProjects()
  }, [userId, viewMode])

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id)
    }
  }, [projects, selectedProject])

  useEffect(() => {
    if (viewMode && initialData) {
      setTotalPrice(initialData.totalPrice)
      setSelectedProject(initialData.project)
      setProjectName(initialData.projectName || "Unknown Project")
      setNotes(initialData.notes)
      setItemsPurchased(initialData.items)
      setCategory(initialData.category || "")
      setVendorName(initialData.vendorName || "")
    }
  }, [viewMode, initialData])

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleManualImageClick = () => {
    manualImageInputRef.current?.click()
  }

  const handleManualImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setManualReceiptImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setManualReceiptImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files])

      const firstImageFile = files.find((file) => file.type.startsWith("image/"))
      if (firstImageFile && !totalPrice) {
        analyzeReceiptImage(firstImageFile)
      }
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) {
      setError("Please select a project")
      return
    }

    if (!totalPrice || Number.parseFloat(totalPrice) <= 0) {
      setError("Please enter a valid total price")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const bundleId = crypto.randomUUID()

      const fileData: Array<{ url: string; mimeType: string }> = []
      
      // Collect all files to upload (selected files + manual image if exists)
      const filesToUpload: File[] = [...selectedFiles]
      if (manualReceiptImage) {
        filesToUpload.push(manualReceiptImage)
      }

      // Only process files if they exist
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const uploadFormData = new FormData()
          uploadFormData.append("file", file)

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: uploadFormData,
          })

          if (!uploadResponse.ok) {
            console.error(`[v0] Failed to upload file: ${file.name}`)
            continue
          }

          const uploadResult = await uploadResponse.json()
          fileData.push({
            url: uploadResult.url,
            mimeType: uploadResult.contentType,
          })
        }

        if (filesToUpload.length > 0 && fileData.length === 0) {
          setError("Failed to upload files")
          setLoading(false)
          return
        }
      }

      const formData = new FormData()
      formData.append("content", notes.trim())
      formData.append("fileData", JSON.stringify(fileData))
      formData.append("bundleId", bundleId)
      formData.append("userId", userId)
      formData.append("receiverId", receiverId)
      formData.append("currentProject", selectedProject)
      formData.append("messageType", "receipt")
      formData.append("totalPrice", totalPrice)
      formData.append("itemsPurchased", JSON.stringify(itemsPurchased))
      formData.append("category", category)
      formData.append("vendorName", vendorName)

      const result = await sendMessageAction(formData)

      if (result.error) {
        setError(result.error)
        } else {
        try {
          const receiptTotal = Number.parseFloat(totalPrice)

          console.log("[v0] Updating project budget for project:", selectedProject)
          console.log("[v0] Subtracting receipt total:", receiptTotal)

          // Get current budget first
          const { data: projectData, error: fetchError } = await supabase
            .from("projects")
            .select("current_budget")
            .eq("id", selectedProject)
            .single()

          if (fetchError) {
            console.error("[v0] Error fetching project budget:", fetchError)
          } else if (projectData) {
            const currentBudget = projectData.current_budget || 0
            const newBudget = currentBudget - receiptTotal

            console.log("[v0] Current budget:", currentBudget)
            console.log("[v0] New budget:", newBudget)

            // Update the budget
            const { error: updateError } = await supabase
              .from("projects")
              .update({ current_budget: newBudget })
              .eq("id", selectedProject)

            if (updateError) {
              console.error("[v0] Error updating project budget:", updateError)
            } else {
              console.log("[v0] Successfully updated project budget")
            }
          }
        } catch (budgetError) {
          console.error("[v0] Error updating project budget:", budgetError)
          // Don't fail the entire submission if budget update fails
        }

        setSelectedFiles([])
        setSelectedProject("")
        setProjectName("")
        setCategory("")
        setVendorName("")
        setNotes("")
        setTotalPrice("")
        setItemsPurchased([])
        setManualReceiptImage(null)
        setManualReceiptImagePreview(null)
        onSuccess?.()
      }
    } catch (err) {
      console.error("[v0] Error submitting receipt:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(",")[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const analyzeReceiptImage = async (file: File) => {
    try {
      setAnalyzingReceipt(true)
      setError(null)
      setQualityAssessment(null)
      setTotalPrice("")
      setItemsPurchased([])

      console.log("[v0] Converting receipt image to base64...")
      const base64 = await fileToBase64(file)

      // Step 1: Extract text from image using OCR (client-side)
      
      console.log("[v0] Starting OCR extraction from receipt image...")
let ocrText = ""

try {
  const Tesseract = (await import("tesseract.js")).default
  const worker = await Tesseract.createWorker("eng")

  const img = new Image()
  img.crossOrigin = "anonymous"
  img.src = `data:${file.type};base64,${base64}`

  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const ocrResult = await worker.recognize(img)
  ocrText = ocrResult.data.text

  console.log("[v0] OCR extraction complete. Text length:", ocrText.length)
  console.log("[v0] OCR confidence:", ocrResult.data.confidence)

  await worker.terminate()
} catch (ocrError) {
  console.error("[v0] OCR extraction failed:", ocrError)

  throw new Error(
    ocrError instanceof Error
      ? `OCR failed: ${ocrError.message}`
      : "OCR failed for an unknown reason."
  )
}

if (!ocrText.trim()) {
  throw new Error("No readable text was found on the receipt.")
}

console.log("[v0] Sending OCR text to ChatGPT for analysis...")

const response = await fetch("/api/analyze-receipt", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    method: "analyzeOCR",
    ocrText,
  }),
})

      const result = await response.json()

      console.log("[v0] Receipt analysis response status:", response.status)
console.log("[v0] Receipt analysis parsed result:", result)

      if (result.success && result.data) {
        const confidencePercentage = result.data.confidencePercentage || 0

        console.log("[v0] Receipt analysis confidence:", confidencePercentage + "%")

        // Store quality assessment
        if (result.data.confidencePercentage !== undefined && result.data.imageQuality) {
          setQualityAssessment({
            confidencePercentage: result.data.confidencePercentage,
            imageQuality: result.data.imageQuality,
            uncertainFields: result.data.uncertainFields,
          })
        }

        if (confidencePercentage >= 76) {
          if (result.data.total_cost) {
            console.log("[v0] Receipt analysis successful, total cost:", result.data.total_cost)
            setTotalPrice(result.data.total_cost.toString())
          }

          if (result.data.items && Array.isArray(result.data.items)) {
            console.log("[v0] Extracted items:", result.data.items)
            setItemsPurchased(result.data.items)
          }

          if (result.data.category) {
            console.log("[v0] Extracted category:", result.data.category)
            setCategory(result.data.category)
          }

          if (result.data.vendor_name || result.data.merchant) {
            const vendor = result.data.vendor_name || result.data.merchant
            console.log("[v0] Extracted vendor name:", vendor)
            setVendorName(vendor)
          }

          if (result.data.project_name) {
            console.log("[v0] Extracted project name:", result.data.project_name)
            setProjectName(result.data.project_name)
          }
        } else {
          console.log("[v0] Confidence below 76%, not populating form")
          setError(
            `Receipt image quality is insufficient (${confidencePercentage}% confidence). Please take a clearer photo with better lighting and focus.`,
          )
          setSelectedFiles([])
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          if (cameraInputRef.current) {
            cameraInputRef.current.value = ""
          }
        }
            } else {
        console.log("[v0] Receipt analysis raw result:", result)
        console.log("[v0] Could not extract data from receipt")

        const backendError =
          result && typeof result === "object" && "error" in result
            ? String(result.error)
            : "Could not automatically extract data from receipt."

        setError(backendError)
        setSelectedFiles([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }

          } catch (err) {
      console.error("[v0] Error analyzing receipt:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze receipt"
      setError(`Error: ${errorMessage}. Please try again.`)
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } finally {
      setAnalyzingReceipt(false)
    }
  }

  // Handlers for editing item fields
  const handleItemNameChange = (index: number, value: string) => {
    setItemsPurchased((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], name: value }
      return updated
    })
  }

  const handleItemQuantityChange = (index: number, value: string) => {
    setItemsPurchased((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], quantity: value ? Number(value) : undefined }
      return updated
    })
  }

  const handleItemPriceChange = (index: number, value: string) => {
    setItemsPurchased((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], price: value ? Number.parseFloat(value) : undefined }
      return updated
    })
  }

  const handleRemoveItem = (index: number) => {
    setItemsPurchased((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-xs">Unable to Process Receipt</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {analyzingReceipt && (
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs">
            Analyzing receipt with AI...
          </div>
        )}

        {qualityAssessment && qualityAssessment.confidencePercentage < 76 && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-1">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-xs">Low Confidence: {qualityAssessment.confidencePercentage}%</p>
                <p className="text-xs mt-1">
                  The AI confidence is below the required 76% threshold. Please retake with better lighting and focus.
                </p>
                {qualityAssessment.uncertainFields && qualityAssessment.uncertainFields.length > 0 && (
                  <p className="text-xs mt-1">Uncertain: {qualityAssessment.uncertainFields.join(", ")}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {qualityAssessment && qualityAssessment.confidencePercentage >= 76 && (
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs">
            ✓ Receipt analyzed successfully with {qualityAssessment.confidencePercentage}% confidence
          </div>
        )}

        {!viewMode && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Receipt Files/Images</Label>
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

            <div className="flex gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent text-xs h-9"
                onClick={handleFileClick}
                disabled={loading}
              >
                <Upload className="mr-1 size-3.5" />
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent text-xs h-9"
                onClick={handleCameraClick}
                disabled={loading}
              >
                <Camera className="mr-1 size-3.5" />
                Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent text-xs h-9"
                onClick={() => setShowManualInputDialog(true)}
                disabled={loading}
              >
                <Edit3 className="mr-1 size-3.5" />
                Manual
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-1.5 bg-muted rounded text-xs">
                    <File className="size-3 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-5 h-5 w-5"
                      onClick={() => handleRemoveFile(index)}
                      disabled={loading}
                    >
                      <X className="size-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {viewMode && initialData && initialData.files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Receipt Files</Label>
          <div className="space-y-1.5">
            {initialData.files.map((file, index) => {
              const isImage = file.mimeType?.startsWith("image/")

              if (isImage && file.url) {
                return (
                  <div key={index} className="rounded overflow-hidden bg-muted/50">
                    <img
                      src={file.url || "/placeholder.svg"}
                      alt="Receipt"
                      className="max-h-48 w-full object-contain rounded cursor-pointer"
                      onClick={() => window.open(file.url!, "_blank")}
                    />
                  </div>
                )
              } else if (file.url) {
                const fileName = file.url.split("/").pop() || "file"
                return (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-1.5 bg-muted rounded text-xs hover:underline"
                  >
                    <File className="size-3" />
                    <span className="truncate">{fileName}</span>
                  </a>
                )
              }
              return null
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="project" className="text-xs font-medium">Project</Label>
          {viewMode ? (
            <div className="w-full px-2 py-2 border border-input rounded text-xs bg-muted h-9 flex items-center">
              {projectName || 'No project'}
            </div>
          ) : (
            <Select
              value={selectedProject}
              onValueChange={setSelectedProject}
              disabled={loading || loadingProjects || viewMode}
            >
              <SelectTrigger id="project" className="w-full h-9 text-xs">
                <SelectValue placeholder={loadingProjects ? "Loading..." : "Select project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="text-xs">
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="totalPrice" className="text-xs font-medium">Total Price</Label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            <input
              id="totalPrice"
              type="number"
              step="0.01"
              min="0"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              placeholder="0.00"
              className="w-full h-9 pl-6 pr-2 text-xs border border-input rounded bg-background"
              disabled={loading || analyzingReceipt || viewMode}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs font-medium">Category</Label>
          {viewMode ? (
            <div className="w-full px-2 py-2 border border-input rounded text-xs bg-muted h-9 flex items-center">
              {category ? category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ') : 'No category'}
            </div>
          ) : (
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={loading || viewMode}
            >
              <SelectTrigger id="category" className="w-full h-9 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lumber" className="text-xs">Lumber</SelectItem>
                <SelectItem value="concrete" className="text-xs">Concrete</SelectItem>
                <SelectItem value="finish" className="text-xs">Finish</SelectItem>
                <SelectItem value="gas" className="text-xs">Gas</SelectItem>
                <SelectItem value="framing" className="text-xs">Framing</SelectItem>
                <SelectItem value="small_tool" className="text-xs">Small Tool</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vendorName" className="text-xs font-medium">Vendor Name</Label>
          {viewMode ? (
            <div className="w-full px-2 py-2 border border-input rounded text-xs bg-muted h-9 flex items-center">
              {vendorName || 'No vendor name'}
            </div>
          ) : (
            <input
              id="vendorName"
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g., Home Depot"
              className="w-full h-9 px-2 text-xs border border-input rounded bg-background"
              disabled={loading || analyzingReceipt || viewMode}
            />
          )}
        </div>
      </div>

      {itemsPurchased.length > 0 && (
        <div className="space-y-1.5">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full justify-between bg-transparent text-xs h-9">
                <span>Items ({itemsPurchased.length})</span>
                <span className="text-xs text-muted-foreground">View</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-sm">Items Purchased</DialogTitle>
                <DialogDescription className="text-xs">
                  {viewMode
                    ? "Items from this receipt"
                    : "Review and edit the items extracted from your receipt."}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[100px] overflow-y-auto flex-1">
                <div className="divide-y divide-border">
                  {itemsPurchased.map((item, index) => (
                    <div key={index} className="p-2 space-y-1.5">
                      <div className="space-y-0.5">
                        <Label htmlFor={`item-name-${index}`} className="text-xs text-muted-foreground">
                          Item Name
                        </Label>
                        <input
                          id={`item-name-${index}`}
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemNameChange(index, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-input rounded bg-background h-7"
                          disabled={loading || analyzingReceipt || viewMode}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <Label htmlFor={`item-quantity-${index}`} className="text-xs text-muted-foreground">
                            Quantity
                          </Label>
                          <input
                            id={`item-quantity-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity || ""}
                            onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs border border-input rounded bg-background h-7"
                            disabled={loading || analyzingReceipt || viewMode}
                          />
                        </div>

                        <div className="space-y-0.5">
                          <Label htmlFor={`item-price-${index}`} className="text-xs text-muted-foreground">
                            Price
                          </Label>
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              $
                            </span>
                            <input
                              id={`item-price-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price || ""}
                              onChange={(e) => handleItemPriceChange(index, e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-5 pr-2 py-1 text-xs border border-input rounded bg-background h-7"
                              disabled={loading || analyzingReceipt || viewMode}
                            />
                          </div>
                        </div>
                      </div>

                      {!viewMode && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(index)}
                          disabled={loading || analyzingReceipt}
                        >
                          <X className="size-3 mr-1" />
                          Remove Item
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs font-medium">Message</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this receipt..."
          rows={2}
          className="text-xs"
          disabled={loading || viewMode}
        />
      </div>

      {/* Manual Input Dialog */}
      <Dialog open={showManualInputDialog} onOpenChange={setShowManualInputDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Manual Receipt Entry</DialogTitle>
            <DialogDescription className="text-xs">
              Enter receipt information manually without uploading an image.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Receipt Image *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-3">
                {manualReceiptImagePreview ? (
                  <div className="space-y-1.5">
                    <div className="relative w-full border border-border rounded overflow-hidden bg-muted/50" style={{ maxHeight: "160px" }}>
                      <img
                        src={manualReceiptImagePreview}
                        alt="Receipt preview"
                        className="w-full h-full object-contain rounded"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => {
                        setManualReceiptImage(null)
                        setManualReceiptImagePreview(null)
                        if (manualImageInputRef.current) {
                          manualImageInputRef.current.value = ""
                        }
                      }}
                      disabled={loading}
                    >
                      <X className="mr-1 size-3" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs h-8"
                    onClick={handleManualImageClick}
                    disabled={loading}
                  >
                    <Upload className="mr-2 size-3" />
                    Upload Receipt Image
                  </Button>
                )}
              </div>
              <input
                ref={manualImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleManualImageChange}
                style={{ display: "none" }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="manual-project" className="text-xs font-medium">Project *</Label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                  disabled={loading || loadingProjects}
                >
                  <SelectTrigger id="manual-project" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-xs">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manual-vendor" className="text-xs font-medium">Vendor *</Label>
                <input
                  id="manual-vendor"
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g., Home Depot"
                  className="w-full h-9 px-2 text-xs border border-input rounded bg-background"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="manual-category" className="text-xs font-medium">Category</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={loading}
                >
                  <SelectTrigger id="manual-category" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lumber" className="text-xs">Lumber</SelectItem>
                    <SelectItem value="concrete" className="text-xs">Concrete</SelectItem>
                    <SelectItem value="finish" className="text-xs">Finish</SelectItem>
                    <SelectItem value="gas" className="text-xs">Gas</SelectItem>
                    <SelectItem value="framing" className="text-xs">Framing</SelectItem>
                    <SelectItem value="small_tool" className="text-xs">Small Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manual-total" className="text-xs font-medium">Total *</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <input
                    id="manual-total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 pl-6 pr-2 text-xs border border-input rounded bg-background"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manual-notes" className="text-xs font-medium">Notes</Label>
              <Textarea
                id="manual-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this receipt..."
                rows={2}
                className="text-xs"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setShowManualInputDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs h-8"
              onClick={async () => {
                if (!manualReceiptImage) {
                  setError("Please upload a receipt image")
                  return
                }
                if (!selectedProject || !totalPrice || !vendorName) {
                  setError("Please fill in all required fields")
                  return
                }
                setShowManualInputDialog(false)
              }}
              disabled={loading}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2 justify-end pt-3">
        {viewMode ? (
          <Button type="button" size="sm" onClick={onCancel} className="text-xs h-9">
            Close
          </Button>
        ) : (
          <>
            {onCancel && (
              <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs h-9" disabled={loading || analyzingReceipt}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              className="text-xs h-9"
              disabled={loading || analyzingReceipt || !selectedProject || !totalPrice || (selectedFiles.length === 0 && vendorName === "")}
            >
              {loading ? "Submitting..." : analyzingReceipt ? "Analyzing..." : "Submit"}
            </Button>
          </>
        )}
      </div>
    </form>
    </div>
  )
}
