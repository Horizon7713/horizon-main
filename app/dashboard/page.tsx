import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectsTable } from "@/components/table";
import {
  Building2,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Hammer,
  Mouse as House,
  MessageSquare,
  Receipt,
  Clock,
  ImageIcon,
  Paperclip,
  FolderKanban,
  ScanLine,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { HomeownerProjectDashboard } from "@/components/dashboard/homeowner-project-dashboard";
import { getLatestProjectCaptureStage } from "@/app/project_visuals/actions"

function HeaderAction({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-100"
          : "rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
      }
    >
      {label}
    </button>
  );
}

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "primary" | "success";
}) {
  const toneBorder =
    tone === "primary"
      ? "border-blue-500/25"
      : tone === "success"
        ? "border-emerald-500/25"
        : "border-zinc-800";

  const toneIcon =
    tone === "primary"
      ? "text-blue-300"
      : tone === "success"
        ? "text-emerald-300"
        : "text-zinc-200";

  const toneBar =
    tone === "primary"
      ? "bg-blue-400/70"
      : tone === "success"
        ? "bg-emerald-400/70"
        : "bg-zinc-700";

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${toneBorder} bg-zinc-950`}>
      <div className={`absolute inset-x-0 top-0 h-px ${toneBar}`} />
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
          <div className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-zinc-50">
            {value}
          </div>
          <div className="mt-2 text-xs text-zinc-400">{meta}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-black">
          <Icon className={`h-5 w-5 ${toneIcon}`} />
        </div>
      </div>
    </div>
  );
}

function SurfacePanel({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {eyebrow}
            </div>
          ) : null}
          <div className="mt-1 text-lg font-semibold text-zinc-100">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-zinc-400">{subtitle}</div> : null}
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function LaunchTile({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="group rounded-2xl border border-zinc-800 bg-black p-4 hover:border-zinc-700 hover:bg-zinc-950/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
          <Icon className="h-4 w-4 text-zinc-300" />
        </div>
        <ChevronRight className="mt-1 h-4 w-4 text-zinc-600 group-hover:text-zinc-300" />
      </div>

      <div className="mt-4 text-sm font-medium text-zinc-100">{title}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-400">{description}</div>
    </div>
  );
}

function StatusRow({
  title,
  detail,
  value,
  tone = "default",
}: {
  title: string;
  detail: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const pillClass =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : "border-zinc-700 bg-zinc-900 text-zinc-300";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        <div className="mt-1 text-xs text-zinc-500">{detail}</div>
      </div>
      <div
        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${pillClass}`}
      >
        {value}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (profile?.role === "employee") {
    redirect("/messages");
  }

  let activeProjectsCount = 0;
  let userProjects: any[] = [];

  if (profile?.id) {
    const userRole = profile.role?.toLowerCase();

    if (userRole === "contractor" || userRole === "subcontractor") {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("contractor_user_id", profile.id)
        .order("created_at", { ascending: false });

      if (!error && projects) {
        activeProjectsCount = projects.length;
        userProjects = projects;
      }
    } else if (userRole === "homeowner") {
      const { data: projectAssignments, error } = await supabase
        .from("project_users")
        .select("project_id, projects(*)")
        .eq("user_id", profile.id)
        .eq("status", "active");

      if (!error && projectAssignments) {
        userProjects = projectAssignments
          .map((assignment: any) => assignment.projects)
          .filter((project: any) => project !== null);

        activeProjectsCount = userProjects.length;
      }
    }
  }

  let teamMembersCount = 0;

  if (profile?.id) {
    const userRole = profile.role?.toLowerCase();

    if (userRole === "contractor") {
      const { data: contractor, error } = await supabase
        .from("contractors")
        .select("employees")
        .eq("contractor_user_id", profile.id)
        .maybeSingle();

      if (!error && contractor?.employees) {
        if (Array.isArray(contractor.employees)) {
          if (contractor.employees.length === 1 && typeof contractor.employees[0] === "string") {
            const employeeString = contractor.employees[0];
            if (employeeString.includes(",")) {
              teamMembersCount = employeeString
                .split(",")
                .map((id) => id.trim())
                .filter((id) => id.length > 0).length;
            } else {
              teamMembersCount = 1;
            }
          } else {
            teamMembersCount = contractor.employees.length;
          }
        }
      }
    } else if (userRole === "homeowner") {
      const projectIds = userProjects.map((p) => p.id);

      if (projectIds.length > 0) {
        const { data: projectUsers, error } = await supabase
          .from("project_users")
          .select("user_id")
          .in("project_id", projectIds)
          .eq("status", "active");

        if (!error && projectUsers) {
          const uniqueUsers = new Set(projectUsers.map((pu: any) => pu.user_id));
          teamMembersCount = uniqueUsers.size;
        }
      }
    }
  }

  const userRole = profile?.role?.toLowerCase();

    let recentMessages: any[] = [];
  let houseModelSchema: any = null;
  let siteCaptureSessions: any[] = [];
  let latestCaptureStageResult: any = null

  if (userRole === "homeowner" && profile?.id) {
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        user_id,
        type,
        file_url,
        mime_type,
        users(first_name, last_name, email)
      `)
      .eq("receiver_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && messages) {
      recentMessages = messages;
    }

    const primaryProjectId = userProjects[0]?.id;

    if (primaryProjectId) {
      const { data: houseModelRows, error: houseModelError } = await supabase
        .from("project_house_models")
        .select("schema, created_at")
        .eq("project_id", primaryProjectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!houseModelError && houseModelRows && houseModelRows.length > 0) {
        houseModelSchema = houseModelRows[0].schema;
      }

            try {
        latestCaptureStageResult = await getLatestProjectCaptureStage(primaryProjectId)
      } catch {
        latestCaptureStageResult = null
      }

      const { data: captureRows, error: captureError } = await supabase
        .from("project_capture_sessions")
        .select(`
          id,
          project_id,
          milestone_key,
          capture_date,
          status,
          notes,
          project_capture_images (
            id,
            file_path,
            shot_type,
            sort_order,
            metadata
          ),
          project_capture_outputs (
            id,
            output_type,
            file_path,
            metadata
          )
        `)
        .eq("project_id", primaryProjectId)
        .order("capture_date", { ascending: false });

      if (!captureError && captureRows) {
        siteCaptureSessions = captureRows.map((session: any) => ({
          id: session.id,
          project_id: session.project_id,
          milestone_key: session.milestone_key,
          capture_date: session.capture_date,
          status: session.status,
          notes: session.notes,
          images: session.project_capture_images || [],
          outputs: session.project_capture_outputs || [],
        }));
      }
    }
  }

    if (userRole === "homeowner" && userProjects.length > 0) {
    return (
      <HomeownerProjectDashboard
  projectId={userProjects[0].id}
  project={userProjects[0]}
  houseModelSchema={houseModelSchema}
  siteCaptureSessions={siteCaptureSessions}
  recentMessages={recentMessages}
  latestCaptureStageResult={latestCaptureStageResult}
/>
    );
  }

  const stats =
    userRole === "homeowner"
      ? [
          {
            label: "Assigned Project",
            value: userProjects.length > 0 ? userProjects[0].name : "No project assigned",
            icon: House,
            meta: userProjects.length > 0 ? "Active workspace" : "Awaiting assignment",
            tone: "primary" as const,
          },
          {
            label: "Team Members",
            value: teamMembersCount.toString(),
            icon: Users,
            meta: "Working on your project",
            tone: "default" as const,
          },
        ]
      : [
          {
            label: "Active Projects",
            value: activeProjectsCount.toString(),
            icon: Building2,
            meta: "Current delivery pipeline",
            tone: "primary" as const,
          },
          {
            label: "Team Members",
            value: teamMembersCount.toString(),
            icon: Users,
            meta: "Assigned across projects",
            tone: "default" as const,
          },
          {
            label: "Money Made",
            value: "$1.8M",
            icon: DollarSign,
            meta: "Rolling business total",
            tone: "success" as const,
          },
        ];

  const activities = [
    {
      id: 1,
      project: "Downtown Office Complex",
      message: "Foundation completed ahead of schedule",
      time: "2 hours ago",
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      id: 2,
      project: "Highway Bridge Repair",
      message: "Material delivery delayed by 3 days",
      time: "5 hours ago",
      icon: AlertCircle,
      color: "text-amber-400",
    },
    {
      id: 3,
      project: "School Renovation",
      message: "Electrical work 90% complete",
      time: "1 day ago",
      icon: Hammer,
      color: "text-blue-400",
    },
    {
      id: 4,
      project: "Riverside Residential",
      message: "Framing inspection passed",
      time: "2 days ago",
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      id: 5,
      project: "Downtown Office Complex",
      message: "New team member assigned",
      time: "3 days ago",
      icon: Users,
      color: "text-blue-400",
    },
  ];

  return (
    <div className="min-h-full bg-black text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Enterprise Workspace
            </div>
            <div className="mt-1 text-lg font-semibold text-zinc-100">Construction Intelligence</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HeaderAction label="Overview" active />
            <HeaderAction label="Projects" />
            <HeaderAction label="Operations" />
            <HeaderAction label="Field Access" />
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-5 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="space-y-5">
            <SurfacePanel
              eyebrow="Workspace"
              title="Construction Material Intelligence Platform"
              subtitle={`Welcome back, ${profile?.first_name || user.email}`}
              actions={
                <div className="hidden md:flex items-center gap-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                    Role: {profile?.role || "User"}
                  </div>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <LaunchTile
                  title="Project Controls"
                  description="Manage jobs, ownership, and operational workspaces."
                  icon={FolderKanban}
                />
                <LaunchTile
                  title="Plan Review"
                  description="Open the viewer for sheets, markups, zones, and takeoffs."
                  icon={Building2}
                />
                <LaunchTile
                  title="Material Output"
                  description="Organize downstream trade and spreadsheet deliverables."
                  icon={FileSpreadsheet}
                />
                <LaunchTile
                  title="QR / Field Lookup"
                  description="Support scan-linked project and material access."
                  icon={ScanLine}
                />
              </div>
            </SurfacePanel>

            <div
              className={`grid gap-4 ${
                userRole === "homeowner" ? "md:grid-cols-2" : "md:grid-cols-3"
              }`}
            >
              {stats.map((stat) => (
                <MetricCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  meta={stat.meta}
                  icon={stat.icon}
                  tone={stat.tone}
                />
              ))}
            </div>

            <SurfacePanel
              eyebrow="Projects"
              title="Active Projects"
              subtitle="Track progress and manage your construction workspaces"
              actions={
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                  {activeProjectsCount} active
                </div>
              }
            >
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                <ProjectsTable projects={userProjects} />
              </div>
            </SurfacePanel>
          </div>

          <div className="space-y-5">
            <SurfacePanel
              eyebrow="Operational Status"
              title="Delivery Overview"
              subtitle="High-level construction workflow and field readiness."
            >
              <div className="space-y-3">
                <StatusRow
                  title="Plan Viewer Workflow"
                  detail="Single-page review, markups, and measurement flow."
                  value="Active"
                  tone="success"
                />
                <StatusRow
                  title="Zone / Scope Mapping"
                  detail="Room-level and scope-level organization path."
                  value="In Progress"
                  tone="warning"
                />
                <StatusRow
                  title="Material Export Readiness"
                  detail="Trade-separated output for downstream scheduling and purchasing."
                  value="Queued"
                />
                <StatusRow
                  title="Field QR Access"
                  detail="Foreman lookup and scan-linked material intelligence path."
                  value="Next"
                />
              </div>
            </SurfacePanel>

            <SurfacePanel
              eyebrow="Activity"
              title={userRole === "homeowner" ? "Recent Messages" : "Recent Activity"}
              subtitle={
                userRole === "homeowner"
                  ? "Latest communication and attachments from your team"
                  : "Latest updates across your active projects"
              }
            >
              <div className="space-y-3">
                {userRole === "homeowner" ? (
                  recentMessages.length > 0 ? (
                    recentMessages.map((message) => {
                      const sender = message.users;
                      const senderName =
                        sender?.first_name && sender?.last_name
                          ? `${sender.first_name} ${sender.last_name}`
                          : sender?.email || "Unknown";

                      const contentPreview =
                        message.content?.length > 72
                          ? `${message.content.substring(0, 72)}...`
                          : message.content || "No content";

                      const timeAgo = formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      });

                      let Icon = MessageSquare;
                      let iconColor = "text-blue-400";
                      let typeLabel = "Message";
                      let badgeClasses = "border-blue-500/20 bg-blue-500/10 text-blue-200";

                      if (message.type === "receipt") {
                        Icon = Receipt;
                        iconColor = "text-emerald-400";
                        typeLabel = "Receipt";
                        badgeClasses = "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
                      } else if (message.type === "timecard") {
                        Icon = Clock;
                        iconColor = "text-violet-400";
                        typeLabel = "Timecard";
                        badgeClasses = "border-zinc-700 bg-zinc-900 text-zinc-300";
                      } else if (message.type === "media") {
                        Icon = ImageIcon;
                        iconColor = "text-amber-400";
                        typeLabel = "Media";
                        badgeClasses = "border-amber-500/20 bg-amber-500/10 text-amber-200";
                      } else if (message.file_url) {
                        Icon = Paperclip;
                        iconColor = "text-zinc-400";
                        typeLabel = "File";
                        badgeClasses = "border-zinc-700 bg-zinc-900 text-zinc-300";
                      }

                      const hasImage =
                        message.file_url && message.mime_type?.startsWith("image/");

                      return (
                        <div
                          key={message.id}
                          className="rounded-xl border border-zinc-800 bg-black p-4"
                        >
                          <div className="flex gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                              <Icon className={`h-4 w-4 ${iconColor}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-zinc-100">
                                  {senderName}
                                </p>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${badgeClasses}`}
                                >
                                  {typeLabel}
                                </span>
                              </div>

                              <div className="mt-2 flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-zinc-400">{contentPreview}</p>
                                  <p className="mt-2 text-xs text-zinc-500">{timeAgo}</p>
                                </div>

                                {hasImage ? (
                                  <img
                                    src={message.file_url || "/placeholder.svg"}
                                    alt="Message attachment"
                                    className="h-12 w-12 flex-shrink-0 rounded-lg border border-zinc-800 object-cover"
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-black px-4 py-10 text-center">
                      <MessageSquare className="mx-auto h-8 w-8 text-zinc-600" />
                      <p className="mt-3 text-sm text-zinc-500">No messages yet</p>
                    </div>
                  )
                ) : (
                  activities.map((activity) => {
                    const Icon = activity.icon;

                    return (
                      <div
                        key={activity.id}
                        className="rounded-xl border border-zinc-800 bg-black p-4"
                      >
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                            <Icon className={`h-4 w-4 ${activity.color}`} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-100">
                              {activity.project}
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {activity.message}
                            </p>
                            <p className="mt-2 text-xs text-zinc-500">{activity.time}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SurfacePanel>
          </div>
        </div>
      </div>
    </div>
  );
}
