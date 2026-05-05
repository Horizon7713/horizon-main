"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Flag,
  Plus,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popup } from "@/components/popup"
import { supabase } from "@/lib/supabase/client"
import {
  createCalendarEventAction,
  fetchCalendarEventsAction,
  fetchEventTypesAction,
  fetchPrioritiesAction,
} from "./actions"

function getLocalDateTime(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseAssignedUsers(users: string | null | undefined): string[] {
  if (!users) return []

  return users
    .split(",")
    .map((userId) => userId.trim())
    .filter(Boolean)
}

function formatEventTime(dateString: string): string {
  const eventDate = new Date(dateString)

  return eventDate.toLocaleTimeString("default", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatSelectedDate(date: Date): string {
  return date.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface Project {
  id: string
  name: string
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface EventType {
  id: number
  name: string
}

interface Priority {
  id: number
  name: string
}

interface CalendarEvent {
  id: string
  date: string
  project_id: number
  users: string
  event_type: number | null
  event_priority: number | null
  content: string
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-black">
        <Icon className="h-4 w-4 text-zinc-300" />
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {eyebrow}
        </div>
        <div className="mt-1 text-sm font-semibold text-zinc-100">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), [])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [popupOpen, setPopupOpen] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [creatingEvent, setCreatingEvent] = useState(false)

  const [formData, setFormData] = useState({
    datetime: getLocalDateTime(),
    project: "",
    users: [] as string[],
    eventType: "",
    customEventType: "",
    priority: "",
    content: "",
  })

  useEffect(() => {
    fetchProjects()
    fetchUsers()
    fetchEventTypes()
    fetchPriorities()
    fetchUserRole()
    fetchCalendarEvents()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from("projects").select("id, name")
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchEventTypes = async () => {
    try {
      const result = await fetchEventTypesAction()

      if (result.success) {
        setEventTypes(result.data || [])
      } else {
        console.error("Error fetching event types:", result.error)
      }
    } catch (error) {
      console.error("Error fetching event types:", error)
    }
  }

  const fetchPriorities = async () => {
    try {
      const result = await fetchPrioritiesAction()

      if (result.success) {
        setPriorities(result.data || [])
      } else {
        console.error("Error fetching priorities:", result.error)
      }
    } catch (error) {
      console.error("Error fetching priorities:", error)
    }
  }

  const fetchUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUserRole(null)
        setCurrentUserId(null)
        return
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
        setCurrentUserId(profile.id)
      }
    } catch (error) {
      console.error("Error fetching user role:", error)
    }
  }

  const fetchCalendarEvents = async () => {
    setLoadingEvents(true)

    try {
      const result = await fetchCalendarEventsAction()

      if (result.success) {
        setCalendarEvents(result.data || [])
      } else {
        console.error("Error fetching calendar events:", result.error)
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const visibleEvents = useMemo(() => {
    if (!currentUserId) return []

    return calendarEvents
      .filter((event) => parseAssignedUsers(event.users).includes(currentUserId))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [calendarEvents, currentUserId])

  const selectedDateEvents = useMemo(() => {
    const selectedKey = getDateKey(selectedDate)

    return visibleEvents.filter((event) => {
      const eventDate = new Date(event.date)
      return getDateKey(eventDate) === selectedKey
    })
  }, [selectedDate, visibleEvents])

  const upcomingEvents = useMemo(() => {
    const now = new Date()

    return visibleEvents
      .filter((event) => new Date(event.date) >= now)
      .slice(0, 5)
  }, [visibleEvents])

  const eventStatsForSelectedDate = useMemo(() => {
    const highPriorityCount = selectedDateEvents.filter((event) => {
      const priority = priorities.find((item) => item.id === event.event_priority)
      return priority?.name?.toLowerCase().includes("high")
    }).length

    const projectCount = new Set(
      selectedDateEvents.map((event) => String(event.project_id)),
    ).size

    return {
      total: selectedDateEvents.length,
      highPriorityCount,
      projectCount,
    }
  }, [priorities, selectedDateEvents])

  const getOrCreateEventType = async () => {
    const customName = formData.customEventType.trim()

    if (!customName) {
      return formData.eventType ? parseInt(formData.eventType) : null
    }

    const existingType = eventTypes.find(
      (type) => type.name.toLowerCase() === customName.toLowerCase(),
    )

    if (existingType) {
      return existingType.id
    }

    const { data, error } = await supabase
      .from("event_types")
      .insert({
        name: customName,
      })
      .select("id, name")
      .single()

    if (error) {
      throw error
    }

    setEventTypes((previous) => [...previous, data])

    return data.id
  }

  const handleCreateEvent = async () => {
    if (!formData.datetime || !formData.project || formData.users.length === 0) {
      alert("Please fill in date, project, and assigned users.")
      return
    }

    setCreatingEvent(true)

    try {
      const isoDateTime = new Date(formData.datetime).toISOString()
      const resolvedEventTypeId = await getOrCreateEventType()

      const result = await createCalendarEventAction({
        date: isoDateTime,
        projectId: parseInt(formData.project),
        users: formData.users.join(","),
        eventType: resolvedEventTypeId,
        eventPriority: formData.priority ? parseInt(formData.priority) : null,
        content: formData.content.trim(),
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to create event")
      }

      await fetchCalendarEvents()

      const createdDate = new Date(formData.datetime)
      setSelectedDate(createdDate)
      setCurrentDate(new Date(createdDate.getFullYear(), createdDate.getMonth(), 1))

      setFormData({
        datetime: getLocalDateTime(),
        project: "",
        users: [],
        eventType: "",
        customEventType: "",
        priority: "",
        content: "",
      })

      setPopupOpen(false)
    } catch (error) {
      console.error("Error creating event:", error)
      alert("Failed to create event")
    } finally {
      setCreatingEvent(false)
    }
  }

  const daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

  const firstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const getEventsForDate = (day: number) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayKey = getDateKey(dayDate)

    return visibleEvents.filter((event) => {
      const eventDate = new Date(event.date)
      return getDateKey(eventDate) === dayKey
    })
  }

  const previousMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    setCurrentDate(newDate)
  }

  const nextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  const openCreateForSelectedDate = () => {
    const selected = new Date(selectedDate)
    const now = new Date()

    selected.setHours(now.getHours())
    selected.setMinutes(now.getMinutes())

    setFormData((previous) => ({
      ...previous,
      datetime: getLocalDateTime(selected),
    }))

    setPopupOpen(true)
  }

  const getProjectName = (projectId: number) => {
    return (
      projects.find((project) => String(project.id) === String(projectId))?.name ||
      "Unassigned project"
    )
  }

  const getEventTypeName = (eventTypeId: number | null) => {
    if (!eventTypeId) return null
    return eventTypes.find((type) => type.id === eventTypeId)?.name || null
  }

  const getPriorityName = (priorityId: number | null) => {
    if (!priorityId) return null
    return priorities.find((priority) => priority.id === priorityId)?.name || null
  }

  const getAssignedUserNames = (event: CalendarEvent) => {
    const assignedUserIds = parseAssignedUsers(event.users)

    return assignedUserIds
      .map((userId) => {
        const user = users.find((item) => item.id === userId)
        if (!user) return null
        return `${user.first_name} ${user.last_name}`.trim() || user.email
      })
      .filter(Boolean)
      .join(", ")
  }

  const days: Array<number | null> = []
  const numDays = daysInMonth(currentDate)
  const firstDay = firstDayOfMonth(currentDate)

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  for (let i = 1; i <= numDays; i++) {
    days.push(i)
  }

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  })

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <main className="min-h-full bg-black px-3 py-3 text-zinc-100 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950">
          <div className="flex flex-col gap-4 border-b border-zinc-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Enterprise Workspace
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-100">
                Calendar
              </div>
              <div className="mt-1 text-sm leading-relaxed text-zinc-500">
                View jobsite events, inspections, meetings, deadlines, and assigned work by day.
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={goToToday}
                className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
              >
                Today
              </Button>

              {userRole === "contractor" ? (
                <Button
                  className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
                  onClick={openCreateForSelectedDate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Event
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 p-3 sm:p-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <section className="rounded-2xl border border-zinc-800 bg-black p-3 sm:p-4">
              <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">
                    {monthName}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Tap a day to review scheduled events.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={previousMonth}
                    className="h-10 w-full border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 sm:w-10"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextMonth}
                    className="h-10 w-full border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 sm:w-10"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 sm:text-[11px] sm:tracking-[0.14em]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {days.map((day, index) => {
                  const dayDate = day
                    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                    : null

                  const dayEvents = day ? getEventsForDate(day) : []
                  const isToday = dayDate ? isSameDay(dayDate, today) : false
                  const isSelected = dayDate ? isSameDay(dayDate, selectedDate) : false
                  const hasEvents = dayEvents.length > 0

                  return (
                    <button
                      key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${index}`}
                      type="button"
                      disabled={!day}
                      onClick={() => {
                        if (!dayDate) return
                        setSelectedDate(dayDate)
                      }}
                      className={`min-h-16 rounded-xl border p-1.5 text-left transition sm:min-h-28 sm:p-2 ${
                        day
                          ? isSelected
                            ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                            : isToday
                              ? "border-blue-500/25 bg-zinc-950"
                              : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
                          : "cursor-default border-zinc-900 bg-[#09090b]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                            day
                              ? isSelected
                                ? "bg-blue-500 text-white"
                                : isToday
                                  ? "bg-blue-500/10 text-blue-300"
                                  : "text-zinc-100"
                              : "text-zinc-700"
                          }`}
                        >
                          {day}
                        </span>

                        {hasEvents ? (
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200 sm:px-2">
                            {dayEvents.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 hidden space-y-1 sm:block">
                        {dayEvents.slice(0, 2).map((event) => {
                          const eventType = getEventTypeName(event.event_type)

                          return (
                            <div
                              key={event.id}
                              className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2"
                            >
                              <div className="mb-1 flex items-center gap-1 text-blue-200">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="text-[11px] font-semibold">
                                  {formatEventTime(event.date)}
                                </span>
                              </div>

                              <div className="truncate text-xs font-medium text-zinc-100">
                                {eventType || event.content || "Calendar event"}
                              </div>

                              {event.content ? (
                                <div className="mt-1 truncate text-[11px] text-zinc-400">
                                  {event.content}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}

                        {dayEvents.length > 2 ? (
                          <div className="rounded-lg border border-zinc-800 bg-black px-2 py-1 text-[11px] text-zinc-400">
                            +{dayEvents.length - 2} more
                          </div>
                        ) : null}
                      </div>

                      {hasEvents ? (
                        <div className="mt-3 flex gap-1 sm:hidden">
                          {dayEvents.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className="h-1.5 w-1.5 rounded-full bg-blue-300"
                            />
                          ))}

                          {dayEvents.length > 3 ? (
                            <span className="text-[10px] leading-none text-zinc-500">
                              +
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-zinc-800 bg-black p-4">
                <SectionHeader
                  icon={CalendarDays}
                  eyebrow="Selected Day"
                  title={formatSelectedDate(selectedDate)}
                  subtitle="Events, assignments, projects, and priorities for this date."
                />

                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="text-lg font-semibold text-zinc-100">
                      {eventStatsForSelectedDate.total}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">Events</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="text-lg font-semibold text-zinc-100">
                      {eventStatsForSelectedDate.projectCount}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">Projects</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="text-lg font-semibold text-zinc-100">
                      {eventStatsForSelectedDate.highPriorityCount}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">High</div>
                  </div>
                </div>

                {loadingEvents ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                    Loading calendar events...
                  </div>
                ) : selectedDateEvents.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-6">
                    <div className="text-sm font-medium text-zinc-200">
                      Nothing scheduled for this day.
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                      Select another date or create an event for this day.
                    </p>

                    {userRole === "contractor" ? (
                      <Button
                        onClick={openCreateForSelectedDate}
                        className="mt-4 border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Event
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => {
                      const eventType = getEventTypeName(event.event_type)
                      const priority = getPriorityName(event.event_priority)
                      const assignedNames = getAssignedUserNames(event)

                      return (
                        <Card
                          key={event.id}
                          className="border-zinc-800 bg-zinc-950 p-4 shadow-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-blue-200">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-xs font-semibold">
                                  {formatEventTime(event.date)}
                                </span>
                              </div>

                              <h4 className="mt-2 text-sm font-semibold leading-relaxed text-zinc-100">
                                {eventType || "Calendar event"}
                              </h4>

                              {event.content ? (
                                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                                  {event.content}
                                </p>
                              ) : null}
                            </div>

                            {priority ? (
                              <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                                {priority}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 space-y-2 text-xs text-zinc-500">
                            <div className="flex items-start gap-2">
                              <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
                              <span className="text-zinc-400">
                                {getProjectName(event.project_id)}
                              </span>
                            </div>

                            {assignedNames ? (
                              <div className="flex items-start gap-2">
                                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
                                <span>{assignedNames}</span>
                              </div>
                            ) : null}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-black p-4">
                <SectionHeader
                  icon={Clock}
                  eyebrow="Schedule Outlook"
                  title="Upcoming Events"
                  subtitle="Your next assigned calendar items."
                />

                <div className="space-y-3">
                  {upcomingEvents.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                      No upcoming events
                    </div>
                  ) : (
                    upcomingEvents.map((event) => {
                      const eventDate = new Date(event.date)
                      const eventType = getEventTypeName(event.event_type)

                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => {
                            setSelectedDate(eventDate)
                            setCurrentDate(
                              new Date(eventDate.getFullYear(), eventDate.getMonth(), 1),
                            )
                          }}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-zinc-100">
                                {eventType || "Calendar event"}
                              </h4>
                              <p className="mt-1 text-xs text-zinc-500">
                                {eventDate.toLocaleDateString("default", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}{" "}
                                at {formatEventTime(event.date)}
                              </p>

                              {event.content ? (
                                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                                  {event.content}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>

        <Popup
          open={popupOpen}
          onOpenChange={setPopupOpen}
          title="Create New Event"
          description="Create a scheduled event and choose or type a custom event type."
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-black p-4">
              <SectionHeader
                icon={CalendarDays}
                eyebrow="Event Setup"
                title="Schedule Event"
                subtitle="Assign project, users, priority, details, and choose or create an event type."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Date & Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.datetime}
                    onChange={(event) =>
                      setFormData({ ...formData, datetime: event.target.value })
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-100 outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Project <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      value={formData.project}
                      onChange={(event) =>
                        setFormData({ ...formData, project: event.target.value })
                      }
                      className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-zinc-100 outline-none focus:border-zinc-700"
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Assigned To <span className="text-red-400">*</span>
                  </label>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    {users.length === 0 ? (
                      <p className="text-sm text-zinc-500">No users available</p>
                    ) : (
                      <div className="space-y-2">
                        {users.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200"
                          >
                            <input
                              type="checkbox"
                              checked={formData.users.includes(user.id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setFormData({
                                    ...formData,
                                    users: [...formData.users, user.id],
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    users: formData.users.filter((id) => id !== user.id),
                                  })
                                }
                              }}
                              className="h-4 w-4"
                            />

                            <Users className="h-4 w-4 shrink-0 text-zinc-500" />

                            <span className="min-w-0 break-words">
                              {user.first_name} {user.last_name} ({user.email})
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {formData.users.length > 0 ? (
                    <p className="text-xs text-zinc-500">
                      {formData.users.length} user(s) selected
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Event Type
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={formData.eventType}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          eventType: event.target.value,
                          customEventType: "",
                        })
                      }
                      disabled={Boolean(formData.customEventType.trim())}
                      className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-100 outline-none focus:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select existing event type</option>
                      {eventTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={formData.customEventType}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          customEventType: event.target.value,
                          eventType: "",
                        })
                      }
                      placeholder="Or type a new event type"
                      className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700"
                    />
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-500">
                    Contractors can choose an existing event type or type a new one, like “Cabinet Delivery”, “Final Walkthrough”, or “Client Selection Meeting”.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Priority
                  </label>
                  <div className="relative">
                    <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      value={formData.priority}
                      onChange={(event) =>
                        setFormData({ ...formData, priority: event.target.value })
                      }
                      className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 text-zinc-100 outline-none focus:border-zinc-700"
                    >
                      <option value="">Select priority</option>
                      {priorities.map((priority) => (
                        <option key={priority.id} value={priority.id}>
                          {priority.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Description
                  </label>

                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500" />

                    <textarea
                      value={formData.content}
                      onChange={(event) =>
                        setFormData({ ...formData, content: event.target.value })
                      }
                      placeholder="Enter event details..."
                      rows={4}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-9 pr-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setPopupOpen(false)}
                disabled={creatingEvent}
                className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
              >
                Cancel
              </Button>

              <Button
                onClick={handleCreateEvent}
                disabled={creatingEvent}
                className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingEvent ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        </Popup>
      </div>
    </main>
  )
}
