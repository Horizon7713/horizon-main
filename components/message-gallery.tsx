"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, ImageIcon, Receipt, Clock, ArrowLeft } from 'lucide-react'
import { supabase } from "@/lib/supabase/client"
import { Popup } from "@/components/popup"
import { FormNewReceipt } from "@/components/form/form-newreceipt"
import { Label } from "@/components/ui/label"

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

  useEffect(() => {
    const fetchAllMessages = async () => {
      setIsLoading(true)
      console.log("[v0] Gallery: Fetching all messages for conversation")

      const result = await fetchMessagesAction(currentUserId, selectedUserId, true, 10000, 0)

      if (result.error) {
        console.error("[v0] Gallery: Error fetching all messages:", result.error)
      } else {
        console.log("[v0] Gallery: Loaded", result.messages.length, "total messages")
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
        return
      }

      const { data, error } = await supabase.from("projects").select("id, name").in("id", projectIds)

      if (error) {
        console.error("Error fetching projects:", error)
      } else if (data) {
        setProjects(data)
      }
    }

    if (allMessages.length > 0) {
      fetchProjects()
    }
  }, [allMessages])

  useEffect(() => {
    const fetchUserProjects = async () => {
 

      // Fetch projects where user is assigned
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .contains("users", [currentUserId])
        .order("name")

      if (error) {
        console.error("[v0] Error fetching user projects:", error)
      } else if (data) {
        console.log("[v0] Fetched", data.length, "projects for user")
        setUserProjects(data)
      }
    }

    fetchUserProjects()
  }, [currentUserId])

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

    return Array.from(bundleMap.values())
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
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

    if (messageDateOnly.getTime() === today.getTime()) {
      return "Today"
    } else if (messageDateOnly >= startOfWeek) {
      return "This Week"
    } else if (messageDateOnly >= thirtyDaysAgo) {
      return "Last 30 Days"
    } else {
      return messageDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }
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

  const filteredMessages = filterMessages(activeTab)

  const displayItems: DisplayItem[] =
  activeTab === "receipts" || activeTab === "timecards"
    ? groupMessagesByBundle(filteredMessages)
    : filteredMessages

  const groupedByDate = groupByDateCategory(displayItems)
  const sortedCategories = Array.from(groupedByDate.keys()).sort((a, b) => {
    const orderA = getCategoryOrder(a)
    const orderB = getCategoryOrder(b)
    if (orderA !== orderB) return orderA - orderB
    if (orderA === 3) {
      const dateA = new Date(a + " 1")
      const dateB = new Date(b + " 1")
      return dateB.getTime() - dateA.getTime()
    }
    return 0
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  }

  const getFileName = (url: string) => {
    return url.split("/").pop() || "file"
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
        projects!inner (
          name
        )
      `)
      .eq("message_bundle", bundleId)
      .maybeSingle()

    if (receiptError || !receipt) {
      console.error("[v0] Error fetching receipt:", receiptError)
      return
    }

    const { data: items, error: itemsError } = await supabase
      .from("receipts_breakdown")
      .select("name, quantity, price")
      .eq("receipt_id", receipt.id)

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

    const projectName = receipt.projects?.[0]?.name || "Unknown Project"

    const receiptDataToSet = {
      totalPrice: receipt.total_price.toString(),
      project: receipt.project,
      projectName: projectName,
      category: receipt.category || "",
      vendorName: receipt.vender_name || "",
      notes: notes,
      items: items || [],
      files: files,
    }

    setReceiptData(receiptDataToSet)
    setReceiptUserId(bundleMessage.user_id)
    setReceiptReceiverId(bundleMessage.receiver_id)
    setReceiptPopupOpen(true)
  }

  const getProjectName = (projectId: string | null): string => {
    if (!projectId) return "No Project"
    const project = projects.find((p) => p.id === projectId)
    return project?.name || "Unknown Project"
  }

  const handleMediaProjectChange = async (messageId: string, newProjectId: string) => {
 

    const { error } = await supabase.from("messages").update({ current_project: newProjectId }).eq("id", messageId)

    if (error) {
      console.error("[v0] Error updating media project:", error)
    } else {
      setAllMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, current_project: newProjectId } : msg)),
      )

      const message = allMessages.find((m) => m.id === messageId)
      if (message?.type === "media") {
        await supabase
          .from("media")
          .update({ project_id: newProjectId })
          .eq("message_bundle", message.bundle_id || messageId)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
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
          <SelectTrigger className="w-[200px]">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-8">Loading all messages...</div>
        ) : displayItems.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">No {activeTab} found</div>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map((category) => (
              <div key={category}>
                <div className="sticky top-0 py-2 mb-4 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{category}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(activeTab === "receipts" || activeTab === "timecards") &&
                    (groupedByDate.get(category) as GroupedMessage[])?.map((bundle) => (
                      <div key={bundle.bundle_id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                        <div className="text-xs text-gray-500">{formatDate(bundle.date_sent)}</div>

                        {activeTab === "receipts" && (
                          <div className="space-y-2">
                            <div
                              className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity pb-2 border-b border-gray-200"
                              onClick={() => handleReceiptClick(bundle.bundle_id)}
                            >
                              <Receipt className="h-4 w-4" />
                              <span>Receipt</span>
                              <ReceiptPrice bundleId={bundle.bundle_id} />
                            </div>
                            {bundle.contents.map((content, idx) => (
                              <div key={idx} className="text-sm text-gray-700">
                                {content}
                              </div>
                            ))}
                            {bundle.files.map((file, idx) => (
                              <div key={idx} className="mt-2">
                                {file.mime_type.startsWith("image/") ? (
                                  <img
                                    src={file.url || "/placeholder.svg"}
                                    alt="Receipt"
                                    className="w-full h-40 object-cover rounded"
                                  />
                                ) : file.mime_type.startsWith("video/") ? (
                                  <video src={file.url} controls className="w-full h-40 rounded" />
                                ) : (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    {getFileName(file.url)}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {activeTab === "timecards" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Clock className="h-4 w-4" />
                              Time Card
                            </div>
                            {bundle.progress_update && (
                              <div className="text-sm font-medium text-blue-600">{bundle.progress_update}</div>
                            )}
                            {bundle.contents.map((content, idx) => (
                              <div key={idx} className="text-sm text-gray-700">
                                {content}
                              </div>
                            ))}
                            {bundle.files.map((file, idx) => (
                              <div key={idx} className="mt-2">
                                {file.mime_type.startsWith("image/") ? (
                                  <img
                                    src={file.url || "/placeholder.svg"}
                                    alt="Time card"
                                    className="w-full h-40 object-cover rounded"
                                  />
                                ) : file.mime_type.startsWith("video/") ? (
                                  <video src={file.url} controls className="w-full h-40 rounded" />
                                ) : (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    {getFileName(file.url)}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  {(activeTab === "media" || activeTab === "files") &&
                    (groupedByDate.get(category) as Message[])?.map((message) => (
                      <div key={message.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                        <div className="text-xs text-gray-500">{formatDate(message.date_sent)}</div>

                        {activeTab === "media" && message.file_url && (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Project</Label>
                              <Select
                                value={message.current_project || ""}
                                onValueChange={(value) => handleMediaProjectChange(message.id, value)}
                              >
                                <SelectTrigger className="h-8 text-xs">
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

                            {message.content && <div className="text-sm text-gray-700">{message.content}</div>}
                            <div>
                              {message.mime_type?.startsWith("image/") ? (
                                <img
                                  src={message.file_url || "/placeholder.svg"}
                                  alt="Media"
                                  className="w-full h-48 object-cover rounded"
                                />
                              ) : message.mime_type?.startsWith("video/") ? (
                                <video src={message.file_url} controls className="w-full h-48 rounded" />
                              ) : null}
                            </div>
                          </div>
                        )}

                        {activeTab === "files" && message.file_url && (
                          <div className="space-y-2">
                            {message.content && <div className="text-sm text-gray-700">{message.content}</div>}
                            <a
                              href={message.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              {getFileName(message.file_url)}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
              userId={receiptUserId}
              receiverId={receiptReceiverId}
              sendMessageAction={async () => ({ success: true })}
              onCancel={() => setReceiptPopupOpen(false)}
              viewMode={true}
              initialData={receiptData}
            />
          )}
        </div>
      </Popup>
    </div>
  )
}

function ReceiptPrice({ bundleId }: { bundleId: string }) {
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
 

      const { data, error } = await supabase
        .from("receipts")
        .select("total_price")
        .eq("message_bundle", bundleId)
        .maybeSingle()

      if (data && !error) {
        setPrice(data.total_price)
      }
    }

    fetchPrice()
  }, [bundleId])

  if (price === null) return null

  return (
    <span className="ml-auto text-sm font-semibold">
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(price)}
    </span>
  )
}
