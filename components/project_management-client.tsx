"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search,
  Calendar,
  Users,
  DollarSign,
  Building2,
  ArrowLeft,
  FileText,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react"

type Project = {
  id: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  users: string[] | null
  company: string | null
  budget: number | null
  square_feet: number | null
  bathroom_count: number | null
  window_count: number | null
  door_count: number | null
  cabinet_count: number | null
  created_at: string
  updated_at: string
}

type Bid = {
  id: string
  project_id: string
  title: string
  description: string | null
  amount: number | null
  pdf_url: string | null
  pdf_filename: string | null
  ai_analysis: string | null
  status: string
  submitted_by: string | null
  created_at: string
  updated_at: string
}

type ProjectAttachment = {
  id: string
  type: string
  file_url: string | null
  mime_type: string | null
  bundle_id: string | null
  current_project: string | null
  date_sent: string | null
}

function isImageAttachment(attachment: ProjectAttachment) {
  return Boolean(attachment.mime_type?.startsWith("image/"))
}

function getAttachmentName(url: string | null) {
  if (!url) return "Attachment"

  try {
    return decodeURIComponent(url.split("/").pop() || "Attachment")
  } catch {
    return url.split("/").pop() || "Attachment"
  }
}

function groupAttachmentsByBundle(attachments: ProjectAttachment[]) {
  return attachments.reduce<Record<string, ProjectAttachment[]>>((acc, attachment) => {
    if (!attachment.bundle_id) return acc

    if (!acc[attachment.bundle_id]) {
      acc[attachment.bundle_id] = []
    }

    acc[attachment.bundle_id].push(attachment)

    return acc
  }, {})
}

function AttachmentPreviewGrid({
  attachments,
}: {
  attachments: ProjectAttachment[]
}) {
  const visibleAttachments = attachments.filter((attachment) => attachment.file_url)

  if (visibleAttachments.length === 0) return null

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {visibleAttachments.slice(0, 6).map((attachment) => {
        const fileUrl = attachment.file_url as string
        const fileName = getAttachmentName(fileUrl)
        const isImage = isImageAttachment(attachment)

        if (isImage) {
          return (
            <a
              key={attachment.id}
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-zinc-800 bg-black"
            >
              <img
                src={fileUrl}
                alt={fileName}
                className="h-28 w-full object-cover transition-transform group-hover:scale-105"
              />
            </a>
          )
        }

        return (
          <a
            key={attachment.id}
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-28 items-center justify-center rounded-xl border border-zinc-800 bg-black px-3 text-center text-xs text-zinc-400 hover:border-zinc-700"
          >
            {attachment.mime_type === "application/pdf" ? "Open PDF" : "Open file"}
          </a>
        )
      })}

      {visibleAttachments.length > 6 ? (
        <div className="flex h-28 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-zinc-400">
          +{visibleAttachments.length - 6} more
        </div>
      ) : null}
    </div>
  )
}

export function ProjectManagementClient() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const [bids, setBids] = useState<Bid[]>([])
  const [bidsLoading, setBidsLoading] = useState(false)
  const [newBid, setNewBid] = useState({
    title: "",
    description: "",
    amount: "",
  })
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [analyzingBid, setAnalyzingBid] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string>("")

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    filterProjects()
  }, [searchQuery, statusFilter, projects])

  useEffect(() => {
    if (selectedProject) {
      fetchBids(selectedProject.id)
    }
  }, [selectedProject])

  const fetchProjects = async () => {
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching projects:", error)
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  const fetchBids = async (projectId: string) => {
    setBidsLoading(true)
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching bids:", error)
    } else {
      setBids(data || [])
    }
    setBidsLoading(false)
  }

  const filterProjects = () => {
    let filtered = projects

    if (searchQuery) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.company?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => project.status.toLowerCase() === statusFilter.toLowerCase())
    }

    setFilteredProjects(filtered)
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file")
      return
    }

    setPdfFile(file)
    setUploadingPdf(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      setPdfUrl(data.url)
      console.log("[v0] PDF uploaded successfully:", data.url)
    } catch (error) {
      console.error("[v0] Error uploading PDF:", error)
      alert("Failed to upload PDF")
      setPdfFile(null)
    } finally {
      setUploadingPdf(false)
    }
  }

  const handleAnalyzeWithGrok = async () => {
    if (!pdfUrl) {
      alert("Please upload a PDF first")
      return
    }

    setAnalyzingBid(true)
    setAiAnalysis("")

    try {
      const response = await fetch("/api/analyze-bid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfUrl,
          title: newBid.title,
          description: newBid.description,
        }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullAnalysis = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          fullAnalysis += chunk
          setAiAnalysis(fullAnalysis)
        }
      }
    } catch (error) {
      console.error("[v0] Error analyzing bid:", error)
      setAiAnalysis("Failed to analyze bid. Please try again.")
    } finally {
      setAnalyzingBid(false)
    }
  }

  const handleSubmitBid = async () => {
    if (!selectedProject || !newBid.title) {
      alert("Please fill in the bid title")
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("You must be logged in to submit a bid")
      return
    }

    const { error } = await supabase.from("bids").insert({
      project_id: selectedProject.id,
      title: newBid.title,
      description: newBid.description || null,
      amount: newBid.amount ? Number.parseFloat(newBid.amount) : null,
      pdf_url: pdfUrl,
      pdf_filename: pdfFile?.name || null,
      ai_analysis: aiAnalysis || null,
      status: "pending",
      submitted_by: user.id,
    })

    if (error) {
      console.error("[v0] Error submitting bid:", error)
      alert("Failed to submit bid")
      return
    }

    setNewBid({ title: "", description: "", amount: "" })
    setPdfFile(null)
    setPdfUrl(null)
    setAiAnalysis("")

    fetchBids(selectedProject.id)
    alert("Bid submitted successfully!")
  }

  const handleDeleteBid = async (bidId: string) => {
    if (!confirm("Are you sure you want to delete this bid?")) return
    const { error } = await supabase.from("bids").delete().eq("id", bidId)

    if (error) {
      console.error("[v0] Error deleting bid:", error)
      alert("Failed to delete bid")
      return
    }

    if (selectedProject) {
      fetchBids(selectedProject.id)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default"
      case "completed":
        return "secondary"
      case "on-hold":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
  }

  const handleBackToList = () => {
    setSelectedProject(null)
    setNewBid({ title: "", description: "", amount: "" })
    setPdfFile(null)
    setPdfUrl(null)
    setAiAnalysis("")
  }

  if (selectedProject) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToList} className="mt-0.5 shrink-0 sm:mt-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="min-w-0 text-xl font-semibold leading-tight sm:text-2xl">{selectedProject.name}</h2>
              <Badge variant={getStatusVariant(selectedProject.status)} className="w-fit">
                {selectedProject.status}
              </Badge>
            </div>

            {selectedProject.company && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedProject.company}</span>
              </p>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4">
            <TabsTrigger value="overview" className="min-h-10 rounded-lg border">
              Overview
            </TabsTrigger>
            <TabsTrigger value="bids" className="min-h-10 rounded-lg border">
              Bids
            </TabsTrigger>
            <TabsTrigger value="media" className="min-h-10 rounded-lg border">
              Media
            </TabsTrigger>
            <TabsTrigger value="people" className="min-h-10 rounded-lg border">
              People
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground sm:text-sm">Start Date</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">{formatDate(selectedProject.start_date)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground sm:text-sm">End Date</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">{formatDate(selectedProject.end_date)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground sm:text-sm">Budget</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">
                      {selectedProject.budget !== null ? `$${selectedProject.budget.toLocaleString()}` : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground sm:text-sm">Team Size</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">{selectedProject.users?.length || 0} members</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-slate-800">Scheduling Inputs</p>
                    <p className="text-xs text-slate-500">
                      These quantities are used to calculate production-based task durations.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-muted-foreground sm:text-sm">Square Feet</p>
                      <p className="mt-1 font-medium">{selectedProject.square_feet ?? "N/A"}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-muted-foreground sm:text-sm">Bathrooms</p>
                      <p className="mt-1 font-medium">{selectedProject.bathroom_count ?? "N/A"}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-muted-foreground sm:text-sm">Windows</p>
                      <p className="mt-1 font-medium">{selectedProject.window_count ?? "N/A"}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-muted-foreground sm:text-sm">Doors</p>
                      <p className="mt-1 font-medium">{selectedProject.door_count ?? "N/A"}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-muted-foreground sm:text-sm">Cabinets</p>
                      <p className="mt-1 font-medium">{selectedProject.cabinet_count ?? "N/A"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bids" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submit New Bid</CardTitle>
                <CardDescription>Upload a PDF and use AI to analyze the bid</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bid-title">Bid Title *</Label>
                  <Input
                    id="bid-title"
                    placeholder="Enter bid title"
                    value={newBid.title}
                    onChange={(e) => setNewBid({ ...newBid, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bid-description">Description</Label>
                  <Textarea
                    id="bid-description"
                    placeholder="Enter bid description"
                    value={newBid.description}
                    onChange={(e) => setNewBid({ ...newBid, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bid-amount">Amount ($)</Label>
                  <Input
                    id="bid-amount"
                    type="number"
                    placeholder="Enter bid amount"
                    value={newBid.amount}
                    onChange={(e) => setNewBid({ ...newBid, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pdf-upload">Upload PDF</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      disabled={uploadingPdf}
                      className="flex-1"
                    />
                    {uploadingPdf && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>

                  {pdfFile && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{pdfFile.name}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleAnalyzeWithGrok}
                    disabled={!pdfUrl || analyzingBid}
                    variant="outline"
                    className="w-full sm:flex-1"
                  >
                    {analyzingBid ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze with Grok AI
                      </>
                    )}
                  </Button>

                  <Button onClick={handleSubmitBid} disabled={!newBid.title} className="w-full sm:flex-1">
                    Submit Bid
                  </Button>
                </div>

                {aiAnalysis && (
                  <div className="space-y-2">
                    <Label>AI Analysis</Label>
                    <div className="rounded-lg bg-muted p-4">
                      <p className="whitespace-pre-wrap text-sm">{aiAnalysis}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submitted Bids</CardTitle>
                <CardDescription>View all bids for this project</CardDescription>
              </CardHeader>

              <CardContent>
                {bidsLoading ? (
                  <p className="py-8 text-center text-muted-foreground">Loading bids...</p>
                ) : bids.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No bids submitted yet</p>
                ) : (
                  <div className="space-y-4">
                    {bids.map((bid) => (
                      <Card key={bid.id}>
                        <CardHeader className="pb-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base sm:text-lg">{bid.title}</CardTitle>
                              {bid.description && <CardDescription className="mt-1">{bid.description}</CardDescription>}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBid(bid.id)}
                              className="self-end text-destructive sm:self-start"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {bid.amount && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">${bid.amount.toLocaleString()}</span>
                            </div>
                          )}

                          {bid.pdf_url && (
                            <div className="flex items-start gap-2">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <a
                                href={bid.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-sm text-primary hover:underline"
                              >
                                {bid.pdf_filename || "View PDF"}
                              </a>
                            </div>
                          )}

                          {bid.ai_analysis && (
                            <div className="space-y-2">
                              <p className="flex items-center gap-1 text-sm font-medium">
                                <Sparkles className="h-4 w-4" />
                                AI Analysis
                              </p>
                              <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">{bid.ai_analysis}</div>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">Submitted on {formatDate(bid.created_at)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>Project photos and documents</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="py-8 text-center text-muted-foreground">No media available</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="people" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
                <CardDescription>Team members and stakeholders</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="py-8 text-center text-muted-foreground">No team members listed</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Project Management</h2>
        <p className="text-sm text-muted-foreground sm:text-base">View and manage all projects</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 overflow-x-hidden md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const daysRemaining = calculateDaysRemaining(project.end_date)

          return (
  <div key={project.id} onClick={() => handleProjectClick(project)}>
    <div className="block sm:hidden">
      <button
        type="button"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-left text-sm font-medium text-zinc-100"
      >
        <span className="block truncate">{project.name}</span>
      </button>
    </div>

    <div className="hidden sm:block">
      <Card className="cursor-pointer transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="line-clamp-2 text-base sm:text-lg">{project.name}</CardTitle>
              <Badge variant={getStatusVariant(project.status)} className="shrink-0">
                {project.status}
              </Badge>
            </div>

            {project.company && (
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{project.company}</span>
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-snug">
              {formatDate(project.start_date)} - {formatDate(project.end_date)}
            </span>
          </div>

          {daysRemaining !== null && (
            <div className="text-sm">
              {daysRemaining > 0 ? (
                <span className="text-muted-foreground">{daysRemaining} days remaining</span>
              ) : daysRemaining === 0 ? (
                <span className="font-medium text-orange-600">Due today</span>
              ) : (
                <span className="font-medium text-red-600">{Math.abs(daysRemaining)} days overdue</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{project.users?.length || 0} members</span>
            </div>

            {project.budget !== null && (
              <div className="flex items-center gap-1 text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                <span>${project.budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
) 
          })}
        </div>
      )}
    </div>
  )
}
