"use client"

import { useEffect, useState } from "react"
import JSZip from "jszip"
import { ArrowLeft, Clock, Download, ExternalLink, FileText, ImageIcon, Receipt } from "lucide-react"

import { FormNewReceipt } from "@/components/form/form-newreceipt"
import { Popup } from "@/components/popup"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"

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
  progress_update?: string | null
  current_project?: string | null
}

type GroupedMessage = {
  bundle_id: string
  date_sent: string
  type: string
  progress_update?: string
  contents: string[]
  files: Array<{ url: string; mime_type: string }>
}

type ReceiptMeta = {
  id: string
  message_bundle: string | null
  total_price: number | null
  receipt_period_key: string | null
  receipt_period_label: string | null
  receipt_folder_key: string | null
  receipt_folder_label: string | null
  card_used: string | null
  vender_name: string | null
  auth_code: string | null
  uploaded_by: string | null
}

type ReceiptItem = {
  name: string | null
  quantity: number | null
  price: number | null
}

type UserMeta = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type ReceiptFolderGroup = {
  key: string
  label: string
  receipts: GroupedMessage[]
}

type ReceiptPeriodGroup = {
  key: string
  label: string
  sortDate: string
  folders: ReceiptFolderGroup[]
}

type DisplayItem = Message | GroupedMessage

type Project = {
  id: string
  name: string
}

interface MessageGalleryProps {
  currentUserId: string
  selectedUserId: string
  fetchMessagesAction: (
    userId: string,
    otherUserId: string,
    initialLoad?: boolean,
    limit?: number,
    offset?: number,
  ) => Promise<{ messages: Message[]; error?: string; totalCount?: number }>
  onClose: () => void
}

type TabType = "receipts" | "timecards" | "media" | "files"

export function MessageGallery({ currentUserId, selectedUserId, fetchMessagesAction, onClose }: MessageGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabType>("receipts")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [projects, setProjects] = useState<Project[]>([])
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [receiptPopupOpen, setReceiptPopupOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [receiptUserId, setReceiptUserId] = useState<string>("")
  const [receiptReceiverId, setReceiptReceiverId] = useState<string>("")
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [receiptMetaByBundle, setReceiptMetaByBundle] = useState<Record<string, ReceiptMeta>>({})
  const [userMetaById, setUserMetaById] = useState<Record<string, UserMeta>>({})
  const [downloadingFolderKey, setDownloadingFolderKey] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllMessages = async () => {
      setIsLoading(true)

      const result = await fetchMessagesAction(currentUserId, selectedUserId, true, 10000, 0)

      if (result.error) {
        console.error("[MessageGallery] Error fetching all messages:", result.error)
      } else {
        setAllMessages(result.messages)
      }

      setIsLoading(false)
    }

    fetchAllMessages()
  }, [currentUserId, selectedUserId, fetchMessagesAction])

  useEffect(() => {
    const fetchProjects = async () => {
      const projectIds = Array.from(new Set(allMessages.map((msg) => msg.current_project).filter(Boolean))) as string[]

      if (projectIds.length === 0) {
        setProjects([])
        return
      }

      const { data, error } = await supabase.from("projects").select("id, name").in("id", projectIds)

      if (error) {
        console.error("[MessageGallery] Error fetching projects:", error)
        return
      }

      setProjects(data || [])
    }

    fetchProjects()
  }, [allMessages])

  useEffect(() => {
    const fetchUserProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .contains("users", [currentUserId])
        .order("name")

      if (error) {
        console.error("[MessageGallery] Error fetching user projects:", error)
        return
      }

      setUserProjects(data || [])
    }

    fetchUserProjects()
  }, [currentUserId])

  useEffect(() => {
    const fetchReceiptMeta = async () => {
      const receiptBundleIds = Array.from(
        new Set(
          allMessages
            .filter((message) => message.type === "receipt")
            .map((message) => message.bundle_id || message.id)
            .filter(Boolean),
        ),
      )

      if (receiptBundleIds.length === 0) {
        setReceiptMetaByBundle({})
        setUserMetaById({})
        return
      }

      const { data, error } = await supabase
        .from("receipts")
        .select(`
          id,
          message_bundle,
          total_price,
          receipt_period_key,
          receipt_period_label,
          receipt_folder_key,
          receipt_folder_label,
          card_used,
          vender_name,
          auth_code,
          uploaded_by
        `)
        .in("message_bundle", receiptBundleIds)

      if (error) {
        console.error("[MessageGallery] Error fetching receipt folder metadata:", error)
        return
      }

      const nextMetaByBundle: Record<string, ReceiptMeta> = {}
      const receipts = (data || []) as ReceiptMeta[]

      receipts.forEach((receipt) => {
        if (receipt.message_bundle) {
          nextMetaByBundle[receipt.message_bundle] = receipt
        }
      })

      setReceiptMetaByBundle(nextMetaByBundle)

      const uploaderIds = Array.from(new Set(receipts.map((receipt) => receipt.uploaded_by).filter(Boolean))) as string[]

      if (uploaderIds.length === 0) {
        setUserMetaById({})
        return
      }

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", uploaderIds)

      if (usersError) {
        console.error("[MessageGallery] Error fetching receipt uploaders:", usersError)
        return
      }

      const nextUserMetaById: Record<string, UserMeta> = {}

      ;((usersData || []) as UserMeta[]).forEach((user) => {
        nextUserMetaById[user.id] = user
      })

      setUserMetaById(nextUserMetaById)
    }

    fetchReceiptMeta()
  }, [allMessages])

  const groupMessagesByBundle = (messages: Message[]): GroupedMessage[] => {
    const bundleMap = new Map<string, GroupedMessage>()

    messages.forEach((msg) => {
      const bundleId = msg.bundle_id || msg.id

      if (!bundleMap.has(bundleId)) {
        bundleMap.set(bundleId, {
          bundle_id: bundleId,
          date_sent: msg.date_sent,
          type: msg.type,
          progress_update: msg.progress_update || undefined,
          contents: [],
          files: [],
        })
      }

      const bundle = bundleMap.get(bundleId)!

      if (msg.content && msg.content.trim()) {
        bundle.contents.push(msg.content)
      }

      if (msg.file_url && msg.mime_type) {
        bundle.files.push({ url: msg.file_url, mime_type: msg.mime_type })
      }

      if (msg.progress_update && !bundle.progress_update) {
        bundle.progress_update = msg.progress_update
      }
    })

    return Array.from(bundleMap.values()).sort(
      (a, b) => new Date(b.date_sent).getTime() - new Date(a.date_sent).getTime(),
    )
  }

  const filterMessages = (tab: TabType) => {
    let filtered = allMessages

    if (selectedProject !== "all") {
      filtered = filtered.filter((msg) => msg.current_project === selectedProject)
    }

    switch (tab) {
      case "receipts":
        return filtered.filter((msg) => msg.type === "receipt")
      case "timecards":
        return filtered.filter((msg) => msg.type === "timecard")
      case "media":
        return filtered.filter(
          (msg) =>
            msg.file_url &&
            msg.mime_type &&
            (msg.mime_type.startsWith("image/") || msg.mime_type.startsWith("video/")) &&
            msg.type !== "receipt" &&
            msg.type !== "timecard",
        )
      case "files":
        return filtered.filter(
          (msg) =>
            msg.file_url &&
            msg.mime_type &&
            !msg.mime_type.startsWith("image/") &&
            !msg.mime_type.startsWith("video/") &&
            msg.type !== "receipt" &&
            msg.type !== "timecard",
        )
      default:
        return []
    }
  }

  const getDateCategory = (dateString: string): string => {
    const messageDate = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

    if (messageDateOnly.getTime() === today.getTime()) return "Today"
    if (messageDateOnly >= startOfWeek) return "This Week"
    if (messageDateOnly >= thirtyDaysAgo) return "Last 30 Days"

    return messageDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const groupByDateCategory = <T extends { date_sent: string }>(items: T[]): Map<string, T[]> => {
    const sorted = [...items].sort((a, b) => new Date(b.date_sent).getTime() - new Date(a.date_sent).getTime())
    const grouped = new Map<string, T[]>()

    sorted.forEach((item) => {
      const category = getDateCategory(item.date_sent)

      if (!grouped.has(category)) {
        grouped.set(category, [])
      }

      grouped.get(category)!.push(item)
    })

    return grouped
  }

  const getCategoryOrder = (category: string): number => {
    if (category === "Today") return 0
    if (category === "This Week") return 1
    if (category === "Last 30 Days") return 2
    return 3
  }

  const groupReceiptBundlesByFolders = (bundles: GroupedMessage[]): ReceiptPeriodGroup[] => {
    const periodMap = new Map<
      string,
      {
        key: string
        label: string
        sortDate: string
        folders: Map<string, ReceiptFolderGroup>
      }
    >()

    bundles.forEach((bundle) => {
      const meta = receiptMetaByBundle[bundle.bundle_id]

      const periodKey = meta?.receipt_period_key || getDateCategory(bundle.date_sent)
      const periodLabel = meta?.receipt_period_label || getDateCategory(bundle.date_sent)
      const folderKey = meta?.receipt_folder_key || "unknown-vender-card-not-found"
      const folderLabel = meta?.receipt_folder_label || "Unknown Vender -- Card not found"
      const sortDate = bundle.date_sent

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          key: periodKey,
          label: periodLabel,
          sortDate,
          folders: new Map<string, ReceiptFolderGroup>(),
        })
      }

      const period = periodMap.get(periodKey)!

      if (new Date(sortDate).getTime() > new Date(period.sortDate).getTime()) {
        period.sortDate = sortDate
      }

      if (!period.folders.has(folderKey)) {
        period.folders.set(folderKey, {
          key: folderKey,
          label: folderLabel,
          receipts: [],
        })
      }

      period.folders.get(folderKey)!.receipts.push(bundle)
    })

    return Array.from(periodMap.values())
      .map((period) => ({
        key: period.key,
        label: period.label,
        sortDate: period.sortDate,
        folders: Array.from(period.folders.values()).sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
  }

  const filteredMessages = filterMessages(activeTab)

  const displayItems: DisplayItem[] =
    activeTab === "receipts" || activeTab === "timecards" ? groupMessagesByBundle(filteredMessages) : filteredMessages

  const receiptPeriodGroups =
    activeTab === "receipts" ? groupReceiptBundlesByFolders(displayItems as GroupedMessage[]) : []

  const groupedByDate = groupByDateCategory(displayItems)

  const sortedCategories = Array.from(groupedByDate.keys()).sort((a, b) => {
    const orderA = getCategoryOrder(a)
    const orderB = getCategoryOrder(b)

    if (orderA !== orderB) return orderA - orderB

    if (orderA === 3) {
      const dateA = new Date(`${a} 1`)
      const dateB = new Date(`${b} 1`)
      return dateB.getTime() - dateA.getTime()
    }

    return 0
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount))
  }

  const getFileName = (url: string) => {
    return url.split("/").pop()?.split("?")[0] || "file"
  }

  const cleanDownloadName = (value: string) => {
    return value
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-")
      .toLowerCase()
  }

  const getUploaderName = (uploadedBy: string | null | undefined) => {
    if (!uploadedBy) return "Unknown User"

    const user = userMetaById[uploadedBy]

    if (!user) return uploadedBy

    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()

    return fullName || user.email || uploadedBy
  }

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  const getFirstImageFile = (files: Array<{ url: string; mime_type: string }>) => {
    return files.find((file) => file.mime_type.startsWith("image/")) || files[0] || null
  }

  const fetchReceiptItems = async (receiptId: string | null | undefined): Promise<ReceiptItem[]> => {
    if (!receiptId) return []

    const { data, error } = await supabase
      .from("receipts_breakdown")
      .select("name, quantity, price")
      .eq("receipt_id", receiptId)

    if (error) {
      console.error("[MessageGallery] Error fetching receipt items:", error)
      return []
    }

    return (data || []) as ReceiptItem[]
  }

  const buildReceiptItemLines = (items: ReceiptItem[]) => {
    if (items.length === 0) {
      return ["No receipt items found", ""]
    }

    return items.flatMap((item, index) => [
      `Item ${index + 1}: ${item.name || "Unnamed item"}`,
      `Quantity: ${item.quantity ?? "Not found"}`,
      `Price: ${formatCurrency(item.price) || "Not found"}`,
      `Cost Code:`,
      "",
    ])
  }

  const downloadReceiptFolder = async (period: ReceiptPeriodGroup, folder: ReceiptFolderGroup) => {
    const downloadKey = `${period.key}-${folder.key}`

    try {
      setDownloadingFolderKey(downloadKey)

      const zip = new JSZip()

      const periodName = cleanDownloadName(period.label || "receipts")
      const folderName = cleanDownloadName(folder.label || "receipt-folder")

      const uploaderNames = Array.from(
        new Set(
          folder.receipts.map((receiptBundle) => {
            const receiptMeta = receiptMetaByBundle[receiptBundle.bundle_id]
            return getUploaderName(receiptMeta?.uploaded_by)
          }),
        ),
      )

      const uploaderName =
        uploaderNames.length === 1
          ? uploaderNames[0]
          : uploaderNames.length > 1
            ? "multiple-users"
            : "unknown-user"

      const zipFileName = `${cleanDownloadName(uploaderName)}-receipts-${periodName}-${folderName}.zip`
      const receiptFolder = zip.folder(`${period.label} - ${folder.label}`)

      if (!receiptFolder) return

      const summaryRows = [
        "Receipt Folder Export",
        `Date Folder: ${period.label}`,
        `Vender/Card Folder: ${folder.label}`,
        `Receipt Count: ${folder.receipts.length}`,
        "",
        "Receipts",
        "--------",
        "",
      ]

      for (const receiptBundle of folder.receipts) {
        const receiptMeta = receiptMetaByBundle[receiptBundle.bundle_id]
        const receiptItems = await fetchReceiptItems(receiptMeta?.id)
        const itemLines = buildReceiptItemLines(receiptItems)

        const receiptDate = formatDate(receiptBundle.date_sent)
        const receiptTotal = formatCurrency(receiptMeta?.total_price) || "Total not found"
        const venderName = receiptMeta?.vender_name || "Unknown Vender"
        const authCode = receiptMeta?.auth_code || "Auth code not found"
        const uploadedBy = getUploaderName(receiptMeta?.uploaded_by)
        const cardUsed = receiptMeta?.card_used || "Card not found"
        const receiptLinks = receiptBundle.files.map((file) => file.url).filter(Boolean)
        const firstReceiptLink = receiptLinks[0] || "Receipt image link not found"

        const singleReceiptFolderName = cleanDownloadName(`receipt-${receiptDate}-${venderName}-${authCode}`)
        const singleReceiptFolder = receiptFolder.folder(singleReceiptFolderName)

        if (!singleReceiptFolder) continue

        const receiptInfoLines = [
          `Date Uploaded: ${receiptDate}`,
          `Price: ${receiptTotal}`,
          `Vender Name: ${venderName}`,
          `Auth Code: ${authCode}`,
          `Uploaded By: ${uploadedBy}`,
          `Card Used: ${cardUsed}`,
          `Cost Code:`,
          `Vender/Card Folder: ${folder.label}`,
          `Period: ${period.label}`,
          "",
          "Receipt Link:",
          firstReceiptLink,
          "",
          "All Receipt File Links:",
          ...(receiptLinks.length > 0 ? receiptLinks : ["No receipt file links found"]),
          "",
          "Items:",
          ...itemLines,
          "Notes:",
          receiptBundle.contents.length ? receiptBundle.contents.join("\n") : "No notes",
        ]

        singleReceiptFolder.file("receipt-info.txt", receiptInfoLines.join("\n"))

        summaryRows.push(
          [
            `Date Uploaded: ${receiptDate}`,
            `Price: ${receiptTotal}`,
            `Vender Name: ${venderName}`,
            `Auth Code: ${authCode}`,
            `Uploaded By: ${uploadedBy}`,
            `Card Used: ${cardUsed}`,
            `Cost Code:`,
            `Receipt Link: ${firstReceiptLink}`,
            "",
            "Items:",
            ...itemLines,
          ].join("\n"),
        )

        for (let fileIndex = 0; fileIndex < receiptBundle.files.length; fileIndex += 1) {
          const file = receiptBundle.files[fileIndex]

          try {
            const response = await fetch(file.url)

            if (!response.ok) {
              singleReceiptFolder.file(
                `file-${fileIndex + 1}-download-failed.txt`,
                `Could not download file: ${file.url}`,
              )
              continue
            }

            const blob = await response.blob()
            const originalFileName = getFileName(file.url)
            const safeFileName = originalFileName.includes(".") ? originalFileName : `receipt-file-${fileIndex + 1}`

            singleReceiptFolder.file(safeFileName, blob)
          } catch (error) {
            console.error("[MessageGallery] Failed to add receipt file to zip:", error)

            singleReceiptFolder.file(
              `file-${fileIndex + 1}-download-failed.txt`,
              `Could not download file: ${file.url}`,
            )
          }
        }
      }

      receiptFolder.file("folder-summary.txt", summaryRows.join("\n"))

      const zipBlob = await zip.generateAsync({ type: "blob" })
      downloadBlob(zipBlob, zipFileName)
    } finally {
      setDownloadingFolderKey(null)
    }
  }

  const renderFilePreview = ({
    file,
    alt,
    heightClass = "h-40",
  }: {
    file: { url: string; mime_type: string }
    alt: string
    heightClass?: string
  }) => {
    if (file.mime_type.startsWith("image/")) {
      return (
        <img
          src={file.url || "/placeholder.svg"}
          alt={alt}
          className={`w-full ${heightClass} rounded-lg object-cover`}
        />
      )
    }

    if (file.mime_type.startsWith("video/")) {
      return <video src={file.url} controls className={`w-full ${heightClass} rounded-lg`} />
    }

    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <Download className="h-4 w-4" />
        {getFileName(file.url)}
      </a>
    )
  }

  const handleReceiptClick = async (bundleId: string) => {
    const bundleMessage = allMessages.find((msg) => msg.bundle_id === bundleId || msg.id === bundleId)

    if (!bundleMessage) return

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select(`
        id,
        total_price,
        project,
        uploaded_by,
        category,
        vender_name,
        auth_code,
        card_used,
        receipt_period_label,
        receipt_folder_label,
        projects!inner (
          name
        )
      `)
      .eq("message_bundle", bundleId)
      .maybeSingle()

    if (receiptError || !receipt) {
      console.error("[MessageGallery] Error fetching receipt:", receiptError)
      return
    }

    const { data: items, error: itemsError } = await supabase
      .from("receipts_breakdown")
      .select("name, quantity, price")
      .eq("receipt_id", receipt.id)

    if (itemsError) {
      console.error("[MessageGallery] Error fetching receipt items:", itemsError)
    }

    const receiptMessages = allMessages.filter(
      (msg) => (msg.bundle_id === bundleId || msg.id === bundleId) && msg.type === "receipt",
    )

    const notes = receiptMessages
      .filter((m) => m.content.trim())
      .map((m) => m.content)
      .join("\n")

    const files = receiptMessages
      .filter((m) => m.file_url)
      .map((m) => ({
        url: m.file_url,
        mimeType: m.mime_type,
      }))

    const receiptAny = receipt as any
    const projectName = Array.isArray(receiptAny.projects)
      ? receiptAny.projects[0]?.name || "Unknown Project"
      : receiptAny.projects?.name || "Unknown Project"

    setReceiptData({
      totalPrice: receipt.total_price?.toString() || "",
      project: receipt.project,
      projectName,
      category: receipt.category || "",
      vendorName: receipt.vender_name || "",
      authCode: receipt.auth_code || "",
      cardUsed: receipt.card_used || "",
      receiptPeriodLabel: receipt.receipt_period_label || "",
      receiptFolderLabel: receipt.receipt_folder_label || "",
      notes,
      items: items || [],
      files,
    })

    setReceiptUserId(bundleMessage.user_id)
    setReceiptReceiverId(bundleMessage.receiver_id)
    setReceiptPopupOpen(true)
  }

  const handleMediaProjectChange = async (messageId: string, newProjectId: string) => {
    const { error } = await supabase.from("messages").update({ current_project: newProjectId }).eq("id", messageId)

    if (error) {
      console.error("[MessageGallery] Error updating media project:", error)
      return
    }

    setAllMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, current_project: newProjectId } : msg)),
    )

    const message = allMessages.find((m) => m.id === messageId)

    if (message?.type === "media") {
      await supabase.from("media").update({ project_id: newProjectId }).eq("message_bundle", message.bundle_id || messageId)
    }
  }

  const renderReceiptFolders = () => {
    if (receiptPeriodGroups.length === 0) {
      return <div className="py-8 text-center text-sm text-muted-foreground">No receipts found</div>
    }

    return (
      <div className="space-y-7">
        {receiptPeriodGroups.map((period) => (
          <div key={period.key} className="space-y-4">
            <div className="sticky top-0 z-10 border-b border-zinc-800 bg-background/95 py-3 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{period.label}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {period.folders.length} folder{period.folders.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {period.folders.map((folder) => {
                const downloadKey = `${period.key}-${folder.key}`
                const isDownloading = downloadingFolderKey === downloadKey

                return (
                  <div key={folder.key} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-zinc-800 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-zinc-100">{folder.label}</h4>
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                            {folder.receipts.length} receipt{folder.receipts.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Download includes images, receipt links, item breakdown, and blank cost code lines.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-zinc-800 bg-black text-zinc-200 hover:bg-zinc-900 sm:w-auto"
                        onClick={() => downloadReceiptFolder(period, folder)}
                        disabled={isDownloading}
                      >
                        <Download className="h-4 w-4" />
                        {isDownloading ? "Building folder..." : "Download folder"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                      {folder.receipts.map((bundle) => {
                        const meta = receiptMetaByBundle[bundle.bundle_id]
                        const firstFile = getFirstImageFile(bundle.files)
                        const total = formatCurrency(meta?.total_price)

                        return (
                          <button
                            key={bundle.bundle_id}
                            type="button"
                            onClick={() => handleReceiptClick(bundle.bundle_id)}
                            className="group overflow-hidden rounded-2xl border border-zinc-800 bg-black text-left shadow-sm transition hover:border-zinc-700 hover:bg-zinc-950 hover:shadow-md"
                          >
                            <div className="relative h-36 w-full overflow-hidden bg-zinc-900">
                              {firstFile ? (
                                firstFile.mime_type.startsWith("image/") ? (
                                  <img
                                    src={firstFile.url || "/placeholder.svg"}
                                    alt="Receipt thumbnail"
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                                    Receipt file
                                  </div>
                                )
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                                  No image
                                </div>
                              )}

                              {firstFile ? (
                                <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/70 p-2 text-white backdrop-blur">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </div>
                              ) : null}
                            </div>

                            <div className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Date Uploaded
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-zinc-100">{formatDate(bundle.date_sent)}</div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Total
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-zinc-100">{total || "No total"}</div>
                                </div>
                              </div>

                              <div className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs">
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-zinc-500">Vender</span>
                                  <span className="text-right font-medium text-zinc-200">
                                    {meta?.vender_name || "Unknown Vender"}
                                  </span>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-zinc-500">Auth Code</span>
                                  <span className="text-right font-medium text-zinc-200">
                                    {meta?.auth_code || "Not found"}
                                  </span>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-zinc-500">Card</span>
                                  <span className="text-right font-medium text-zinc-200">
                                    {meta?.card_used || "Card not found"}
                                  </span>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-zinc-500">Uploaded By</span>
                                  <span className="text-right font-medium text-zinc-200">
                                    {getUploaderName(meta?.uploaded_by)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderStandardGallery = () => {
    return (
      <div className="space-y-6">
        {sortedCategories.map((category) => (
          <div key={category}>
            <div className="sticky top-0 mb-4 border-b border-zinc-800 bg-background py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{category}</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeTab === "timecards" &&
                (groupedByDate.get(category) as GroupedMessage[])?.map((bundle) => (
                  <div key={bundle.bundle_id} className="space-y-2 rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="text-xs text-zinc-500">{formatDate(bundle.date_sent)}</div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <Clock className="h-4 w-4" />
                        Time Card
                      </div>

                      {bundle.progress_update ? (
                        <div className="text-sm font-medium text-blue-400">{bundle.progress_update}</div>
                      ) : null}

                      {bundle.contents.map((content, idx) => (
                        <div key={`${bundle.bundle_id}-content-${idx}`} className="text-sm text-zinc-300">
                          {content}
                        </div>
                      ))}

                      {bundle.files.map((file, idx) => (
                        <div key={`${bundle.bundle_id}-file-${idx}`} className="mt-2">
                          {renderFilePreview({ file, alt: "Time card" })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {(activeTab === "media" || activeTab === "files") &&
                (groupedByDate.get(category) as Message[])?.map((message) => (
                  <div key={message.id} className="space-y-2 rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="text-xs text-zinc-500">{formatDate(message.date_sent)}</div>

                    {activeTab === "media" && message.file_url ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Project</Label>
                          <Select
                            value={message.current_project || ""}
                            onValueChange={(value) => handleMediaProjectChange(message.id, value)}
                          >
                            <SelectTrigger className="h-8 border-zinc-800 bg-black text-xs">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {userProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {message.content ? <div className="text-sm text-zinc-300">{message.content}</div> : null}

                        {message.mime_type?.startsWith("image/") ? (
                          <img
                            src={message.file_url || "/placeholder.svg"}
                            alt="Media"
                            className="h-48 w-full rounded-lg object-cover"
                          />
                        ) : message.mime_type?.startsWith("video/") ? (
                          <video src={message.file_url} controls className="h-48 w-full rounded-lg" />
                        ) : null}
                      </div>
                    ) : null}

                    {activeTab === "files" && message.file_url ? (
                      <div className="space-y-2">
                        {message.content ? <div className="text-sm text-zinc-300">{message.content}</div> : null}

                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
                        >
                          <Download className="h-4 w-4" />
                          {getFileName(message.file_url)}
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-black text-zinc-100">
      <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-300 hover:bg-zinc-900">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Button
            variant={activeTab === "receipts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("receipts")}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            Receipts
          </Button>

          <Button
            variant={activeTab === "timecards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("timecards")}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Time Cards
          </Button>

          <Button
            variant={activeTab === "media" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("media")}
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Media
          </Button>

          <Button
            variant={activeTab === "files" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("files")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Files
          </Button>
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full border-zinc-800 bg-black sm:w-[220px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-black p-4 touch-pan-y">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading all messages...</div>
        ) : displayItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">No {activeTab} found</div>
        ) : activeTab === "receipts" ? (
          renderReceiptFolders()
        ) : (
          renderStandardGallery()
        )}
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
              userId={receiptUserId}
              receiverId={receiptReceiverId}
              sendMessageAction={async () => ({ success: true })}
              onCancel={() => setReceiptPopupOpen(false)}
              viewMode={true}
              initialData={receiptData}
            />
          ) : null}
        </div>
      </Popup>
    </div>
  )
}
