'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Popup } from '@/components/popup'
import { supabase } from '@/lib/supabase/client'
import { fetchEventTypesAction, fetchPrioritiesAction, createCalendarEventAction, fetchCalendarEventsAction } from './actions'

// Helper function to format local datetime for datetime-local input
function getLocalDateTime(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
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
    project: '',
    users: [] as string[],
    eventType: '',
    priority: '',
    content: '',
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
      const { data, error } = await supabase.from('projects').select('id, name')
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id, first_name, last_name, email')
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchEventTypes = async () => {
    try {
      const result = await fetchEventTypesAction()
      if (result.success) {
        setEventTypes(result.data || [])
      } else {
        console.error('Error fetching event types:', result.error)
      }
    } catch (error) {
      console.error('Error fetching event types:', error)
    }
  }

  const fetchPriorities = async () => {
    try {
      const result = await fetchPrioritiesAction()
      if (result.success) {
        setPriorities(result.data || [])
      } else {
        console.error('Error fetching priorities:', result.error)
      }
    } catch (error) {
      console.error('Error fetching priorities:', error)
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
        .from('users')
        .select('id, role')
        .eq('auth_id', user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
        // Set currentUserId to the user's ID from the users table, not the auth ID
        setCurrentUserId(profile.id)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchCalendarEvents = async () => {
    try {
      const result = await fetchCalendarEventsAction()
      if (result.success) {
        setCalendarEvents(result.data || [])
      } else {
        console.error('Error fetching calendar events:', result.error)
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    }
  }

  const handleCreateEvent = async () => {
    if (!formData.datetime || !formData.project || formData.users.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Convert datetime-local to ISO 8601 string with timezone (timestamptz)
      const isoDateTime = new Date(formData.datetime).toISOString()
      
      const result = await createCalendarEventAction({
        date: isoDateTime,
        projectId: parseInt(formData.project),
        users: formData.users.join(','),
        eventType: formData.eventType ? parseInt(formData.eventType) : null,
        eventPriority: formData.priority ? parseInt(formData.priority) : null,
        content: formData.content,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create event')
      }

      // Refresh calendar events
      await fetchCalendarEvents()

      // Reset form with local current time
      setFormData({
        datetime: getLocalDateTime(),
        project: '',
        users: [],
        eventType: '',
        priority: '',
        content: '',
      })
      setPopupOpen(false)
      alert('Event created successfully!')
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Failed to create event')
    }
  }

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

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

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">Manage your project schedule and events</p>
          </div>
          <Button 
            className="gap-2" 
            onClick={() => setPopupOpen(true)}
            style={{ display: userRole === 'contractor' ? 'flex' : 'none' }}
          >
            <Plus className="w-4 h-4" />
            New Event
          </Button>
        </div>

        {/* Event Form Popup */}
        <Popup
          open={popupOpen}
          onOpenChange={setPopupOpen}
          title="Create New Event"
          description="Add a new event to your calendar"
        >
          <div className="space-y-4">
            {/* Date & Time Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.datetime}
                onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            {/* Project Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Project</label>
              <select
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* User Multi-Select */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Assigned To</label>
              <div className="border border-border rounded-md p-3 bg-background max-h-48 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users available</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 cursor-pointer">
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
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-foreground">
                          {user.first_name} {user.last_name} ({user.email})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {formData.users.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.users.length} user(s) selected
                </p>
              )}
            </div>

            {/* Event Type Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Event Type</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select event type</option>
                {eventTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select priority</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Textarea */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter event details..."
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPopupOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateEvent}>
                Create Event
              </Button>
            </div>
          </div>
        </Popup>

        {/* Calendar Card */}
        <Card className="p-6 bg-background border border-border">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">{monthName}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center font-semibold text-muted-foreground text-sm py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : []
              return (
                <div
                  key={index}
                  className={`aspect-auto min-h-24 p-2 border border-border rounded-lg flex flex-col items-start justify-start text-xs transition-colors ${
                    day
                      ? 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold mb-1">{day}</div>
                  <div className="w-full space-y-1">
                    {dayEvents.map((event) => {
                      const eventType = eventTypes.find((t) => t.id === event.event_type)
                      const eventDate = new Date(event.date)
                      const hours = String(eventDate.getHours()).padStart(2, '0')
                      const minutes = String(eventDate.getMinutes()).padStart(2, '0')
                      const timeStr = `${parseInt(hours) % 12 || 12}:${minutes} ${parseInt(hours) >= 12 ? 'PM' : 'AM'}`
                      return (
                        <div key={event.id} className="bg-blue-500 text-white p-2 rounded w-full">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="font-semibold text-xs">{timeStr}</span>
                          </div>
                          <div className="font-medium truncate text-xs">{event.content || 'Untitled'}</div>
                          {eventType && (
                            <div className="text-xs opacity-90">{eventType.name}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Upcoming Events Section */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">Upcoming Events</h3>
          <div className="grid gap-4">
            {getUpcomingEvents().length === 0 ? (
              <Card className="p-4 border border-border">
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </Card>
            ) : (
              getUpcomingEvents().map((event) => {
                const eventDate = new Date(event.date)
                const eventType = eventTypes.find((t) => t.id === event.event_type)
                return (
                  <Card key={event.id} className="p-4 border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground">{event.content || 'Untitled Event'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {eventDate.toLocaleDateString('default', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {eventType && (
                        <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full">
                          {eventType.name}
                        </span>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
