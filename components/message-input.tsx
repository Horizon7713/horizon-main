"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, File, Receipt, Clock, X, ImageIcon, Paperclip } from "lucide-react"
import { Popup } from "@/components/popup"
import { FormNewReceipt } from "@/components/form/form-newreceipt"
import { FormNewTimecard } from "@/components/form/form-newtimecard"
import { FormAttachMedia } from "@/components/form/form-attachmedia"
import { offlineQueue } from "@/lib/offline-queue"

interface MessageInputProps {
  userId: string
  sendMessageAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>
  currentProject?: string
  receiverId?: string
}

export function MessageInput({
  userId,
  sendMessageAction,
  currentProject,
  receiverId,
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [receiptPopupOpen, setReceiptPopupOpen] = useState(false)
  const [timecardPopupOpen, setTimecardPopupOpen] = useState(false)
  const [mediaPopupOpen, setMediaPopupOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isMediaFile = (file: File) => {
    return file.type.startsWith("image/") || file.type.startsWith("video/")
  }

  const hasMediaFiles = selectedFiles.some(isMediaFile)
  const hasNonMediaFiles = selectedFiles.some((file) => !isMediaFile(file))

  const getAcceptedFileTypes = () => {
    if (selectedFiles.length === 0) return undefined
    if (hasMediaFiles) return "image/*,video/*"
    if (hasNonMediaFiles) return "*"
    return undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() && selectedFiles.length === 0) return

    setIsLoading(true)

    try {
      const isOnline = offlineQueue.getIsOnline()

      if (!isOnline) {
        const formData = new FormData()
        formData.append("content", message.trim())
        formData.append("bundleId", crypto.randomUUID())
        formData.append("userId", userId)
        formData.append("receiverId", receiverId || "")
        if (currentProject) {
          formData.append("currentProject", currentProject)
        }

        await offlineQueue.addToQueue(formData, selectedFiles)

        setMessage("")
        setSelectedFiles([])
        alert("You are offline. Message will be sent when connection is restored.")
        setIsLoading(false)
        return
      }

      const bundleId = crypto.randomUUID()
      const fileData: Array<{ url: string; mimeType: string }> = []

      for (const file of selectedFiles) {
        try {
          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
              "x-filename": encodeURIComponent(file.name),
            },
            body: file,
          })

          if (!uploadResponse.ok) {
            let errorMessage = `Failed to upload file: ${file.name}`

            try {
              const errorData = await uploadResponse.json()
              errorMessage = errorData.details || errorData.error || errorMessage
            } catch {
              errorMessage = `${errorMessage} (${uploadResponse.status} ${uploadResponse.statusText})`
            }

            alert(errorMessage)
            continue
          }

          const uploadResult = await uploadResponse.json()

          fileData.push({
            url: uploadResult.url,
            mimeType: uploadResult.contentType,
          })
        } catch (uploadError) {
          alert(
            `Failed to upload ${file.name}: ${
              uploadError instanceof Error ? uploadError.message : "Unknown error"
            }`,
          )
          continue
        }
      }

      if (fileData.length === 0 && !message.trim()) {
        setIsLoading(false)
        return
      }

      const formData = new FormData()
      formData.append("content", message.trim())
      formData.append("fileData", JSON.stringify(fileData))
      formData.append("bundleId", bundleId)
      formData.append("userId", userId)
      formData.append("receiverId", receiverId || "")
      if (currentProject) {
        formData.append("currentProject", currentProject)
      }

      const result = await sendMessageAction(formData)

      if (!result.error) {
        setMessage("")
        setSelectedFiles([])
      }
    } catch (error) {
      console.error("[v0] Error:", error)
    }

    setIsLoading(false)
  }

  const handleFilesClick = () => {
    fileInputRef.current?.click()
  }

  const handleMediaClick = () => {
  setMediaPopupOpen(true)
}

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newFilesAreMedia = files.every(isMediaFile)
      const newFilesAreNonMedia = files.every((file) => !isMediaFile(file))

      if (selectedFiles.length > 0) {
        if (hasMediaFiles && !newFilesAreMedia) {
          alert("Cannot mix media files (images/videos) with other file types")
          if (fileInputRef.current) fileInputRef.current.value = ""
          return
        }

        if (hasNonMediaFiles && !newFilesAreNonMedia) {
          alert("Cannot mix other file types with media files (images/videos)")
          if (fileInputRef.current) fileInputRef.current.value = ""
          return
        }
      }

      setSelectedFiles((prev) => [...prev, ...files])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3 p-2 sm:p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
          accept={getAcceptedFileTypes()}
        />

        {selectedFiles.length > 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-black p-2.5 sm:rounded-2xl sm:p-3">
            <div className="mb-2 flex items-center gap-2 sm:mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 sm:h-8 sm:w-8">
                <Paperclip className="size-3.5 text-zinc-400 sm:size-4" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Attachments
                </div>
                <div className="text-[11px] text-zinc-400 sm:text-xs">
                  {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} ready
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-2 sm:gap-3 sm:px-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-black sm:h-8 sm:w-8">
                    <File className="size-3.5 text-zinc-400 sm:size-4" />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-200 sm:text-sm">
                    {file.name}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg border border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 sm:h-8 sm:w-8"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <X className="size-3 sm:size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}      

<div className="sticky bottom-0 z-30 border-t border-zinc-800 bg-black p-2 md:static md:border-0 md:bg-transparent md:p-0">
  <div className="space-y-2">
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isLoading}
        onClick={() => setMediaPopupOpen(true)}
        className="h-8 w-8 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
      >
        <ImageIcon className="size-3.5" />
        <span className="sr-only">Attach media</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isLoading}
        onClick={() => setTimecardPopupOpen(true)}
        className="h-8 w-8 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
      >
        <Clock className="size-3.5" />
        <span className="sr-only">Submit time card</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isLoading}
        onClick={handleFilesClick}
        className="h-8 w-8 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
      >
        <File className="size-3.5" />
        <span className="sr-only">Upload files</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isLoading}
        onClick={() => setReceiptPopupOpen(true)}
        className="h-8 w-8 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
      >
        <Receipt className="size-3.5" />
        <span className="sr-only">Submit receipt</span>
      </Button>
    </div>

    <div className="flex items-center gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={isLoading}
        className="h-10 min-w-0 flex-1 rounded-xl border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-700"
      />

      <Button
        type="submit"
        disabled={isLoading || (!message.trim() && selectedFiles.length === 0)}
        size="icon"
        className="h-10 w-10 shrink-0 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15 disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600"
      >
        <Send className="size-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  </div>
</div>

      </form>

      {receiverId ? (
        <>
          <Popup
            open={receiptPopupOpen}
            onOpenChange={setReceiptPopupOpen}
            title="Submit Receipt"
            description="Upload receipt files and add details"
          >
            <FormNewReceipt
              userId={userId}
              receiverId={receiverId}
              sendMessageAction={sendMessageAction}
              onSuccess={() => setReceiptPopupOpen(false)}
              onCancel={() => setReceiptPopupOpen(false)}
            />
          </Popup>

          <Popup
            open={timecardPopupOpen}
            onOpenChange={setTimecardPopupOpen}
            title="Submit Timecard"
            description="Upload timecard files and add work details"
          >
            <FormNewTimecard
              userId={userId}
              receiverId={receiverId}
              sendMessageAction={sendMessageAction}
              onSuccess={() => setTimecardPopupOpen(false)}
              onCancel={() => setTimecardPopupOpen(false)}
            />
          </Popup>

          <Popup
            open={mediaPopupOpen}
            onOpenChange={setMediaPopupOpen}
            title="Attach Media"
            description="Upload images or videos to a project"
          >
            <FormAttachMedia
              userId={userId}
              receiverId={receiverId}
              sendMessageAction={sendMessageAction}
              onSuccess={() => setMediaPopupOpen(false)}
              onCancel={() => setMediaPopupOpen(false)}
            />
          </Popup>
        </>
      ) : null}
    </>
  )
}
