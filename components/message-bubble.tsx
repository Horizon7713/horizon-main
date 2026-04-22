"use client"

import { File, Receipt, Clock, ImageIcon, Play, ExternalLink } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl"
import { Popup } from "@/components/popup"
import { FormNewReceipt } from "@/components/form/form-newreceipt"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

function SignedReceiptImageCard({
  fileUrl,
  fileName,
}: {
  fileUrl: string
  fileName: string
}) {
  const { url: imageUrl } = useSignedStorageUrl(fileUrl, "receipts")

  if (!imageUrl) return null

  return (
    <button
      type="button"
      onClick={() => window.open(imageUrl, "_blank")}
      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-center gap-3 p-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-black">
          <img
            src={imageUrl}
            alt="Receipt"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-100">
            {fileName}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Image attachment
          </div>
        </div>

        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
      </div>
    </button>
  )
}

function FileCard({
  href,
  fileName,
  icon,
  label,
  isCurrentUser,
}: {
  href: string
  fileName: string
  icon?: React.ReactNode
  label: string
  isCurrentUser: boolean
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
        isCurrentUser
          ? "border-slate-500/30 bg-slate-700/30 hover:border-slate-400/40 hover:bg-slate-700/40"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          isCurrentUser
            ? "border-slate-400/25 bg-slate-800/40"
            : "border-zinc-800 bg-black",
        ].join(" ")}
      >
        {icon ?? <File className="h-4 w-4 text-zinc-300" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-100">
          {fileName}
        </div>
        <div className="mt-1 text-xs text-zinc-500">{label}</div>
      </div>

      <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
    </a>
  )
}

function MediaImageCard({
  src,
  alt,
  onOpen,
}: {
  src: string
  alt: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block overflow-hidden rounded-xl border border-zinc-800 transition-opacity hover:opacity-90"
    >
      <img
        src={src}
        alt={alt}
        className="max-h-[320px] w-full object-cover"
      />
    </button>
  )
}

function MediaVideoCard({ src }: { src: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
      <video
        src={src}
        controls
        className="max-h-[320px] w-full"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

export function MessageBubble({
  messages,
  isCurrentUser,
  senderName,
}: MessageBubbleProps) {
  const firstMessage = messages[0]

  const [receiptTotalPrice, setReceiptTotalPrice] = useState<number | null>(null)
  const [receiptCategory, setReceiptCategory] = useState<string | null>(null)
  const [receiptPopupOpen, setReceiptPopupOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string | null>(null)

  const textMessages = useMemo(
    () => messages.filter((m) => m.type === "text" && m.content.trim()),
    [messages],
  )
  const fileMessages = useMemo(
    () => messages.filter((m) => m.type === "file" && m.file_url),
    [messages],
  )
  const receiptMessages = useMemo(
    () => messages.filter((m) => m.type === "receipt"),
    [messages],
  )
  const receiptFiles = useMemo(
    () => receiptMessages.filter((m) => m.file_url),
    [receiptMessages],
  )
  const receiptText = useMemo(
    () => receiptMessages.filter((m) => m.content.trim()),
    [receiptMessages],
  )
  const timecardMessages = useMemo(
    () => messages.filter((m) => m.type === "timecard"),
    [messages],
  )
  const timecardFiles = useMemo(
    () => timecardMessages.filter((m) => m.file_url),
    [timecardMessages],
  )
  const timecardText = useMemo(
    () => timecardMessages.filter((m) => m.content.trim()),
    [timecardMessages],
  )
  const mediaMessages = useMemo(
    () => messages.filter((m) => m.type === "media"),
    [messages],
  )
  const mediaFiles = useMemo(
    () => mediaMessages.filter((m) => m.file_url),
    [mediaMessages],
  )
  const mediaText = useMemo(
    () => mediaMessages.filter((m) => m.content.trim()),
    [mediaMessages],
  )

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

    const { data: items } = await supabase
      .from("receipts_breakdown")
      .select("name, quantity, price")
      .eq("receipt_id", receipt.id)

    const notes = receiptText.map((m) => m.content).join("\n")
    const files = receiptFiles.map((m) => ({
      url: m.file_url,
      mimeType: m.mime_type,
    }))

    const resolvedProjectName = receipt.projects?.[0]?.name || "Unknown Project"

    setReceiptData({
      totalPrice: receipt.total_price.toString(),
      category: receipt.category || "",
      vendorName: receipt.vender_name || "",
      project: receipt.project,
      projectName: resolvedProjectName,
      notes,
      items: items || [],
      files,
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
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const openImagePreview = (url: string, fileName: string) => {
    setImagePreviewUrl(url)
    setImageFileName(fileName)
    setImagePreviewOpen(true)
  }

  const bubbleClass = isCurrentUser
    ? "border border-slate-500/30 bg-slate-300 text-slate-900"
    : "border border-zinc-800 bg-black text-zinc-100"

  const metaTextClass = isCurrentUser ? "text-slate-700/80" : "text-zinc-500"

  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[85%] min-w-0 flex-col gap-1 sm:max-w-[75%] md:max-w-[640px]">
        {!isCurrentUser && senderName ? (
          <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {senderName}
          </div>
        ) : null}

        <div className={`overflow-hidden rounded-2xl px-3 py-3 sm:px-4 ${bubbleClass}`}>
          <div className="space-y-3">
            {textMessages.map((msg) => (
              <p
                key={msg.id}
                className="text-sm leading-6 break-words [overflow-wrap:anywhere]"
              >
                {msg.content}
              </p>
            ))}

            {receiptMessages.length > 0 ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className={[
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    isCurrentUser
                      ? "border-slate-500/25 bg-slate-700/25 hover:bg-slate-700/35"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900",
                  ].join(" ")}
                  onClick={handleReceiptClick}
                >
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                      isCurrentUser
                        ? "border-slate-400/25 bg-slate-800/35"
                        : "border-zinc-800 bg-black",
                    ].join(" ")}
                  >
                    <Receipt className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Receipt</div>
                    {receiptCategory ? (
                      <div className="mt-1 text-xs opacity-70">
                        {formatCategory(receiptCategory)}
                      </div>
                    ) : null}
                  </div>

                  {receiptTotalPrice !== null ? (
                    <div className="text-sm font-semibold">
                      {formatCurrency(receiptTotalPrice)}
                    </div>
                  ) : null}
                </button>

                {receiptText.map((msg) => (
                  <p key={msg.id} className="text-sm leading-6 break-words">
                    {msg.content}
                  </p>
                ))}

                {receiptFiles.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")
                  const isPdf = mimeType === "application/pdf"
                  const fileName = msg.file_url?.split("/").pop() || "receipt-file"

                  if (!msg.file_url) return null

                  if (isImage) {
                    return (
                      <SignedReceiptImageCard
                        key={msg.id}
                        fileUrl={msg.file_url}
                        fileName={fileName}
                      />
                    )
                  }

                  if (isVideo) {
                    return <MediaVideoCard key={msg.id} src={msg.file_url} />
                  }

                  if (isPdf) {
                    return (
                      <FileCard
                        key={msg.id}
                        href={msg.file_url}
                        fileName={fileName}
                        label="PDF attachment"
                        isCurrentUser={isCurrentUser}
                      />
                    )
                  }

                  return (
                    <FileCard
                      key={msg.id}
                      href={msg.file_url}
                      fileName={fileName}
                      label="File attachment"
                      isCurrentUser={isCurrentUser}
                    />
                  )
                })}
              </div>
            ) : null}

            {timecardMessages.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-current/10 pb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-semibold">Time Card</span>
                </div>

                {timecardText.map((msg) => (
                  <p key={msg.id} className="text-sm leading-6 break-words">
                    {msg.content}
                  </p>
                ))}

                {timecardFiles.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")
                  const isPdf = mimeType === "application/pdf"
                  const fileName = msg.file_url?.split("/").pop() || "timecard-file"

                  if (!msg.file_url) return null

                  if (isImage) {
                    return (
                      <MediaImageCard
                        key={msg.id}
                        src={msg.file_url}
                        alt="Time card image"
                        onOpen={() => openImagePreview(msg.file_url!, fileName)}
                      />
                    )
                  }

                  if (isVideo) {
                    return <MediaVideoCard key={msg.id} src={msg.file_url} />
                  }

                  if (isPdf) {
                    return (
                      <FileCard
                        key={msg.id}
                        href={msg.file_url}
                        fileName={fileName}
                        label="PDF attachment"
                        isCurrentUser={isCurrentUser}
                      />
                    )
                  }

                  return (
                    <FileCard
                      key={msg.id}
                      href={msg.file_url}
                      fileName={fileName}
                      label="File attachment"
                      isCurrentUser={isCurrentUser}
                    />
                  )
                })}
              </div>
            ) : null}

            {mediaMessages.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-current/10 pb-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">Media</span>
                  {projectName ? (
                    <span className="ml-auto text-xs opacity-70">{projectName}</span>
                  ) : null}
                </div>

                {mediaText.map((msg) => (
                  <p key={msg.id} className="text-sm leading-6 break-words">
                    {msg.content}
                  </p>
                ))}

                {mediaFiles.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")
                  const fileName = msg.file_url?.split("/").pop() || "media-file"

                  if (!msg.file_url) return null

                  if (isImage) {
                    return (
                      <MediaImageCard
                        key={msg.id}
                        src={msg.file_url}
                        alt="Media image"
                        onOpen={() => openImagePreview(msg.file_url!, fileName)}
                      />
                    )
                  }

                  if (isVideo) {
                    return <MediaVideoCard key={msg.id} src={msg.file_url} />
                  }

                  return null
                })}
              </div>
            ) : null}

            {fileMessages.length > 0 ? (
              <div className="space-y-3">
                {fileMessages.map((msg) => {
                  const mimeType = msg.mime_type || ""
                  const isImage = mimeType.startsWith("image/")
                  const isVideo = mimeType.startsWith("video/")
                  const isPdf = mimeType === "application/pdf"
                  const fileName = msg.file_url?.split("/").pop() || "file"

                  if (!msg.file_url) return null

                  if (isImage) {
                    return (
                      <MediaImageCard
                        key={msg.id}
                        src={msg.file_url}
                        alt="Shared image"
                        onOpen={() => openImagePreview(msg.file_url!, fileName)}
                      />
                    )
                  }

                  if (isVideo) {
                    return <MediaVideoCard key={msg.id} src={msg.file_url} />
                  }

                  if (isPdf) {
                    return (
                      <FileCard
                        key={msg.id}
                        href={msg.file_url}
                        fileName={fileName}
                        label="PDF attachment"
                        isCurrentUser={isCurrentUser}
                      />
                    )
                  }

                  return (
                    <FileCard
                      key={msg.id}
                      href={msg.file_url}
                      fileName={fileName}
                      label="File attachment"
                      isCurrentUser={isCurrentUser}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <p className={`px-1 text-xs ${metaTextClass}`}>
          {formatTime(firstMessage.date_sent)}
        </p>
      </div>

      <Popup
        open={receiptPopupOpen}
        onOpenChange={setReceiptPopupOpen}
        title="View Receipt"
        description="Receipt details and items"
      >
        <div className="max-h-[500px] overflow-y-auto">
          {receiptData ? (
            <FormNewReceipt
              userId={firstMessage.user_id}
              receiverId={firstMessage.receiver_id}
              sendMessageAction={async () => ({ success: true })}
              onCancel={() => setReceiptPopupOpen(false)}
              viewMode={true}
              initialData={receiptData}
            />
          ) : null}
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
        <DialogContent className="max-w-5xl overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100">
          <DialogHeader className="border-b border-zinc-800 px-4 py-4">
            <DialogTitle className="flex items-center justify-between gap-4">
              <span className="truncate">{imageFileName}</span>
              {imagePreviewUrl ? (
                <a
                  href={imagePreviewUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-amber-300 hover:text-amber-200"
                >
                  Open file
                </a>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center bg-black p-4">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                className="max-h-[85vh] w-auto object-contain"
                alt="Preview"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
