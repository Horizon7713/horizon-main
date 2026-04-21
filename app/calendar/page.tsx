"use client"

import { useState, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CalendarDays,
  Briefcase,
  Users,
  Flag,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popup } from "@/components/popup"
import { supabase } from "@/lib/supabase/client"
import {
  fetchEventTypesAction,
  fetchPrioritiesAction,
  createCalendarEventAction,
  fetchCalendarEventsAction,
} from "./actions"

function getLocalDateTime(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
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
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-black">
        <Icon className="h-4 w-4 text-zinc-300" />
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {eyebrow}
        </div>
        <div className="mt-1 text-sm font-semibold text-zinc-100">{title}</div>
        <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [popupOpen, setPopupOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [formData, setFormData] = useState({
    datetime: getLocalDateTime(),
    project: "",
    users: [] as string[],
    eventType: "",
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
    try {
      const result = await fetchCalendarEventsAction()
      if (result.success) {
        setCalendarEvents(result.data || [])
      } else {
        console.error("Error fetching calendar events:", result.error)
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error)
    }
  }

  const handleCreateEvent = async () => {
    if (!formData.datetime || !formData.project || formData.users.length === 0) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const isoDateTime = new Date(formData.datetime).toISOString()

      const result = await createCalendarEventAction({
        date: isoDateTime,
        projectId: parseInt(formData.project),
        users: formData.users.join(","),
        eventType: formData.eventType ? parseInt(formData.eventType) : null,
        eventPriority: formData.priority ? parseInt(formData.priority) : null,
        content: formData.content,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to create event")
      }

      await fetchCalendarEvents()

      setFormData({
        datetime: getLocalDateTime(),
        project: "",
        users: [],
        eventType: "",
        priority: "",
        content: "",
      })
      setPopupOpen(false)
      alert("Event created successfully!")
    } catch (error) {
      console.error("Error creating event:", error)
      alert("Failed to create event")
    }
  }

  const daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const getEventsForDate = (day: number) => {
    return calendarEvents.filter((event) => {
      if (!currentUserId || !event.users.includes(currentUserId)) {
        return false
      }

      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      )
    })
  }

  const getUpcomingEvents = () => {
    return calendarEvents
      .filter((event) => {
        if (!currentUserId || !event.users.includes(currentUserId)) {
          return false
        }
        return new Date(event.date) >= new Date()
      })
      .slice(0, 5)
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const days = []
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
    <main className="min-h-full bg-black px-5 py-5 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Enterprise Workspace
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-100">
                Calendar
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                Manage your project schedule and events
              </div>
            </div>

            {userRole === "contractor" ? (
              <Button
                className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
                onClick={() => setPopupOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            ) : null}
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-2xl border border-zinc-800 bg-black p-4">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-zinc-100">{monthName}</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={previousMonth}
                    className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextMonth}
                    className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const dayEvents = day ? getEventsForDate(day) : []
                  const isToday =
                    day &&
                    day === new Date().getDate() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear()

                  return (
                    <div
                      key={index}
                      className={`min-h-28 rounded-xl border p-2 transition-colors ${
                        day
                          ? isToday
                            ? "border-blue-500/30 bg-zinc-950"
                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
                          : "border-zinc-900 bg-[#09090b]"
                      }`}
                    >
                      <div
                        className={`mb-2 text-sm font-semibold ${
                          day ? (isToday ? "text-blue-300" : "text-zinc-100") : "text-zinc-700"
                        }`}
                      >
                        {day}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.map((event) => {
                          const eventType = eventTypes.find((t) => t.id === event.event_type)
                          const priority = priorities.find((p) => p.id === event.event_priority)
                          const eventDate = new Date(event.date)
                          const hours = String(eventDate.getHours()).padStart(2, "0")
                          const minutes = String(eventDate.getMinutes()).padStart(2, "0")
                          const timeStr = `${parseInt(hours) % 12 || 12}:${minutes} ${
                            parseInt(hours) >= 12 ? "PM" : "AM"
                          }`

                          return (
                            <div
                              key={event.id}
                              className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2"
                            >
                              <div className="mb-1 flex items-center gap-1 text-blue-200">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="text-[11px] font-semibold">{timeStr}</span>
                              </div>
                              <div className="truncate text-xs font-medium text-zinc-100">
                                {event.content || "Untitled"}
                              </div>
                              {eventType ? (
                                <div className="mt-1 text-[11px] text-zinc-400">
                                  {eventType.name}
                                  {priority ? ` • ${priority.name}` : ""}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                <SectionHeader
                  icon={CalendarDays}
                  eyebrow="Schedule Outlook"
                  title="Upcoming Events"
                  subtitle="Your next assigned calendar items."
                />

                <div className="space-y-3">
                  {getUpcomingEvents().length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-6 text-sm text-zinc-500">
                      No upcoming events
                    </div>
                  ) : (
                    getUpcomingEvents().map((event) => {
                      const eventDate = new Date(event.date)
                      const eventType = eventTypes.find((t) => t.id === event.event_type)
                      const priority = priorities.find((p) => p.id === event.event_priority)

                      return (
                        <Card
                          key={event.id}
                          className="border-zinc-800 bg-zinc-950 p-4 shadow-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-zinc-100">
                                {event.content || "Untitled Event"}
                              </h4>
                              <p className="mt-1 text-sm text-zinc-500">
                                {eventDate.toLocaleDateString("default", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>

                            {eventType ? (
                              <span className="rounded-full border border-zinc-800 bg-black px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                {eventType.name}
                              </span>
                            ) : null}
                          </div>

                          {priority ? (
                            <div className="mt-3 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                              {priority.name}
                            </div>
                          ) : null}
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Popup
          open={popupOpen}
          onOpenChange={setPopupOpen}
          title="Create New Event"
          description="Add a new event to your calendar"
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-black p-4">
              <SectionHeader
                icon={CalendarDays}
                eyebrow="Event Setup"
                title="Schedule Event"
                subtitle="Assign project, users, type, priority, and event details."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.datetime}
                    onChange={(e) =>
                      setFormData({ ...formData, datetime: e.target.value })
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-100 outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Project
                  </label>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      value={formData.project}
                      onChange={(e) =>
                        setFormData({ ...formData, project: e.target.value })
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
                    Assigned To
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
                              onChange={(e) => {
                                if (e.target.checked) {
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
                            <Users className="h-4 w-4 text-zinc-500" />
                            <span>
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

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Event Type
                  </label>
                  <select
                    value={formData.eventType}
                    onChange={(e) =>
                      setFormData({ ...formData, eventType: e.target.value })
                    }
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-zinc-100 outline-none focus:border-zinc-700"
                  >
                    <option value="">Select event type</option>
                    {eventTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Priority
                  </label>
                  <div className="relative">
                    <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
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
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="Enter event details..."
                      rows={4}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPopupOpen(false)}
                className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEvent}
                className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
              >
                Create Event
              </Button>
            </div>
          </div>
        </Popup>
      </div>
    </main>
  )
}
