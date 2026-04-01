"use client"
import { File, Receipt, Clock, ImageIcon, X } from 'lucide-react'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl"
import { Popup } from "@/components/popup"
import { FormNewReceipt } from "@/components/form/form-newreceipt"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Message = {
  id: string
  content: string
  type: string
  date_sent: string
  status: string
  user_id: string
  receiver_id: string
  file_url?: string | null
  bundle_id?: string | null
  mime_type?: string | null
  current_project?: string | null
}

interface MessageBubbleProps {
  messages: Message[]
  isCurrentUser: boolean
  senderName?: string
  senderInitials?: string
}

export function MessageBubble({ messages, isCurrentUser, senderName, senderInitials }: MessageBubbleProps) {
  const firstMessage = messages[0]
  const [receiptTotalPrice, setReceiptTotalPrice] = useState<number | null>(null)
  const [receiptCategory, setReceiptCategory] = useState<string | null>(null)
  const [receiptPopupOpen, setReceiptPopupOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string | null>(null)

  const textMessages = messages.filter((m) => m.type === "text" && m.content.trim())
  const fileMessages = messages.filter((m) => m.type === "file" && m.file_url)
  const receiptMessages = messages.filter((m) => m.type === "receipt")
  const receiptFiles = receiptMessages.filter((m) => m.file_url)
  const receiptText = receiptMessages.filter((m) => m.content.trim())
  const timecardMessages = messages.filter((m) => m.type === "timecard")
  const timecardFiles = timecardMessages.filter((m) => m.file_url)
  const timecardText = timecardMessages.filter((m) => m.content.trim())
  const mediaMessages = messages.filter((m) => m.type === "media")
  const mediaFiles = mediaMessages.filter((m) => m.file_url)
  const mediaText = mediaMessages.filter((m) => m.content.trim())

  useEffect(() => {
    const fetchReceiptTotal = async () => {
      if (receiptMessages.length > 0 && firstMessage.bundle_id) {
        const { data, error } = await supabase
          .from("receipts")
          .select("total_price, category")
          .eq("message_bundle", firstMessage.bundle_id)
          .maybeSingle()

        if (data && !error) {
          setReceiptTotalPrice(data.total_price)
          setReceiptCategory(data.category)
        }
      }
    }

    fetchReceiptTotal()
  }, [receiptMessages.length, firstMessage.bundle_id])

  useEffect(() => {
    const fetchProjectName = async () => {
      if (mediaMessages.length > 0 && firstMessage.current_project) {
        const { data, error } = await supabase
          .from("projects")
          .select("name")
          .eq("id", firstMessage.current_project)
          .maybeSingle()

        if (data && !error) {
          setProjectName(data.name)
        }
      }
    }

    fetchProjectName()
  }, [mediaMessages.length, firstMessage.current_project])

  const handleReceiptClick = async () => {
    if (!firstMessage.bundle_id) return

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select(`
        id, 
        total_price, 
        category, 
        project, 
        uploaded_by,
        vender_name,
        projects!inner (
          name
        )
      `)
      .eq("message_bundle", firstMessage.bundle_id)
      .maybeSingle()

    if (receiptError || !receipt) {
      console.error("[v0] Error fetching receipt:", receiptError)
      return
    }

    const { data: items, error: itemsError } = await supabase
      .from("receipts_breakdown")
      .select("name, quantity, price")
      .eq("receipt_id", receipt.id)

    const notes = receiptText.map((m) => m.content).join("\n")
    const files = receiptFiles.map((m) => ({
      url: m.file_url,
      mimeType: m.mime_type,
    }))

    const projectName = receipt.projects?.name || "Unknown Project"

    setReceiptData({
      totalPrice: receipt.total_price.toString(),
      category: receipt.category || "",
      vendorName: receipt.vender_name || "",
      project: receipt.project,
      projectName: projectName,
      notes: notes,
      items: items || [],
      files: files,
    })

    setReceiptPopupOpen(true)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatCategory = (category: string | null) => {
    if (!category) return null
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className={`flex ${isCurrentUser ? "justify-end gap-2" : "justify-start gap-1"}`}>
      <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[600px] min-w-0">
        <div
          className={`rounded-lg py-2 overflow-hidden break-words border ${
            isCurrentUser
              ? "px-3 sm:px-4 bg-[#c6cade] text-slate-900 border-[#c6cade]"
              : "px-2 sm:px-3 bg-[#06091b] text-foreground border-border"
          }`}
        >
          <div className="space-y-2">
            {textMessages.map((msg) => (
              <p key={msg.id} className="text-sm break-words overflow-wrap-anywhere">
                {msg.content}
              </p>
            ))}

            {receiptMessages.length > 0 && (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-2 pb-2 border-b border-current/10 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleReceiptClick}
                >
                  <Receipt className="size-4" />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Receipt</span>
                      {receiptCategory && (
                        <span className="text-xs opacity-70">{formatCategory(receiptCategory)}</span>
                      )}
                    </div>
                    {receiptTotalPrice !== null && (
                      <span className="text-sm font-semibold">{formatCurrency(receiptTotalPrice)}</span>
                    )}
                  </div>
                </div>

                {receiptText.map((msg) => (
                  <p key={msg.id} className="text-sm break-words">
                    {msg.content}
                  </p>
                ))}

                {receiptFiles.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")
                  const isPdf = mimeType === "application/pdf"

                  if (isImage) {
                    const fileName = msg.file_url?.split("/").pop() || "receipt-image.jpg"
                    const { url: imageUrl } = useSignedStorageUrl(msg.file_url, "receipts")

                    if (!imageUrl) return null

                    return (
                      <button
                        key={msg.id}
                        type="button"
                        onClick={() => {
                          console.log("[v0] Opening receipt image:", imageUrl)
                          window.open(imageUrl, "_blank")
                        }}
                        className="w-full rounded-lg border overflow-hidden transition-all cursor-pointer hover:opacity-90 text-left bg-accent hover:bg-accent/80"
                      >
                        <div className="flex items-center gap-3 p-2">
                          {/* Thumbnail */}
                          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                            <img
                              src={imageUrl}
                              alt="Receipt"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* File info */}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">
                              {fileName}
                            </span>

                            <span className="text-xs opacity-70">
                              Image • Click to open
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  } else if (isVideo) {
                    return (
                      <div key={msg.id} className="rounded overflow-hidden">
                        <video
                          src={msg.file_url!}
                          controls
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: "300px" }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )
                  } else if (isPdf) {
                    const fileName = msg.file_url?.split("/").pop() || "file.pdf"
                    return (
                      <a
                        key={msg.id}
                        href={msg.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm p-2 rounded cursor-pointer hover:opacity-80 transition-opacity w-full ${
                          isCurrentUser ? "bg-background/20 hover:bg-background/30" : "bg-accent hover:bg-accent/80"
                        }`}
                      >
                        <File className="size-4 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                        <span className="text-xs opacity-70 ml-auto">Click to open</span>
                      </a>
                    )
                  } else {
                    const fileName = msg.file_url?.split("/").pop() || "file"
                    return (
                      <a
                        key={msg.id}
                        href={msg.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm hover:underline p-2 rounded ${
                          isCurrentUser ? "bg-background/20" : "bg-accent"
                        }`}
                      >
                        <File className="size-4 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </a>
                    )
                  }
                })}
              </div>
            )}

            {timecardMessages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-current/10">
                  <Clock className="size-4" />
                  <span className="text-sm font-medium">Time Card</span>
                </div>

                {timecardText.map((msg) => (
                  <p key={msg.id} className="text-sm break-words">
                    {msg.content}
                  </p>
                ))}

                {timecardFiles.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")
                  const isPdf = mimeType === "application/pdf"

                  if (isImage) {
                    return (
                      <div key={msg.id} className="rounded overflow-hidden">
                        <img
                          src={msg.file_url! || "/placeholder.svg"}
                          alt="Time card image"
                          className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: "300px" }}
                          onClick={() => window.open(msg.file_url!, "_blank")}
                        />
                      </div>
                    )
                  } else if (isVideo) {
                    return (
                      <div key={msg.id} className="rounded overflow-hidden">
                        <video
                          src={msg.file_url!}
                          controls
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: "300px" }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )
                  } else if (isPdf) {
                    const fileName = msg.file_url?.split("/").pop() || "file.pdf"
                    return (
                      <a
                        key={msg.id}
                        href={msg.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm p-2 rounded cursor-pointer hover:opacity-80 transition-opacity w-full ${
                          isCurrentUser ? "bg-background/20 hover:bg-background/30" : "bg-accent hover:bg-accent/80"
                        }`}
                      >
                        <File className="size-4 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                        <span className="text-xs opacity-70 ml-auto">Click to open</span>
                      </a>
                    )
                  } else {
                    const fileName = msg.file_url?.split("/").pop() || "file"
                    return (
                      <a
                        key={msg.id}
                        href={msg.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm hover:underline p-2 rounded ${
                          isCurrentUser ? "bg-background/20" : "bg-accent"
                        }`}
                      >
                        <File className="size-4 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </a>
                    )
                  }
                })}
              </div>
            )}

            {mediaMessages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-current/10">
                  <ImageIcon className="size-4" />
                  <span className="text-sm font-medium">Media</span>
                  {projectName && <span className="ml-auto text-xs text-muted-foreground">{projectName}</span>}
                </div>

                {mediaText.map((msg) => (
                  <p key={msg.id} className="text-sm break-words">
                    {msg.content}
                  </p>
                ))}

                {mediaFiles.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")

                  if (isImage) {
                    return (
                      <div key={msg.id} className="rounded overflow-hidden">
                        <img
                          src={msg.file_url! || "/placeholder.svg"}
                          alt="Media image"
                          className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: "300px" }}
                          onClick={() => window.open(msg.file_url!, "_blank")}
                        />
                      </div>
                    )
                  } else if (isVideo) {
                    return (
                      <div key={msg.id} className="rounded overflow-hidden">
                        <video
                          src={msg.file_url!}
                          controls
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: "300px" }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            )}

            {fileMessages.length > 0 && (
              <div className="space-y-2">
                {fileMessages.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")
                  const isPdf = mimeType === "application/pdf"

                  if (isImage) {
                    return (
                      <div key={msg.id} className="rounded overflow-hidden">
                        <img
                          src={msg.file_url! || "/placeholder.svg"}
                          alt="Shared image"
                          className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: "300px" }}
                          onClick={() => window.open(msg.file_url!, "_blank")}
                        />
                      </div>
                    )
                  } else if (isVideo) {
                    return (
                      <div key={msg.id} className="rounded overflow-hidden">
                        <video
                          src={msg.file_url!}
                          controls
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: "300px" }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )
                  } else if (isPdf) {
                    const fileName = msg.file_url?.split("/").pop() || "file.pdf"
                    return (
                      <a
                        key={msg.id}
                        href={msg.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm p-2 rounded cursor-pointer hover:opacity-80 transition-opacity w-full ${
                          isCurrentUser ? "bg-background/20 hover:bg-background/30" : "bg-accent hover:bg-accent/80"
                        }`}
                      >
                        <File className="size-4 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                        <span className="text-xs opacity-70 ml-auto">Click to open</span>
                      </a>
                    )
                  } else {
                    const fileName = msg.file_url?.split("/").pop() || "file"
                    return (
                      <a
                        key={msg.id}
                        href={msg.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm hover:underline p-2 rounded ${
                          isCurrentUser ? "bg-background/20" : "bg-accent"
                        }`}
                      >
                        <File className="size-4 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </a>
                    )
                  }
                })}
              </div>
            )}
          </div>

          <p className="text-xs mt-1 text-muted-foreground">{formatTime(firstMessage.date_sent)}</p>
        </div>
      </div>

      <Popup
        open={receiptPopupOpen}
        onOpenChange={setReceiptPopupOpen}
        title="View Receipt"
        description="Receipt details and items"
      >
        <div className="max-h-[500px] overflow-y-auto">
          {receiptData && (
            <FormNewReceipt
              userId={firstMessage.user_id}
              receiverId={firstMessage.receiver_id}
              sendMessageAction={async () => ({ success: true })}
              onCancel={() => setReceiptPopupOpen(false)}
              viewMode={true}
              initialData={receiptData}
            />
          )}
        </div>
      </Popup>

      <Dialog
        open={imagePreviewOpen}
        onOpenChange={(open) => {
          setImagePreviewOpen(open)
          if (!open) {
            setImagePreviewUrl(null)
            setImageFileName(null)
          }
        }}
      >
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{imageFileName}</span>

              {imagePreviewUrl && (
                <a
                  href={imagePreviewUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  Download
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center bg-black/90">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                className="max-h-[85vh] w-auto object-contain"
                alt="Receipt preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
