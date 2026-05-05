"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type Language = "en" | "es"

type TranslationValue = string | Record<string, string>

type Dictionary = Record<string, TranslationValue>

const translations = {
  en: {
    calendar: "Calendar",
    messages: "Messages",
    enterpriseWorkspace: "Enterprise Workspace",
    calendarDescription:
      "View jobsite events, inspections, meetings, deadlines, and assigned work by day.",
    today: "Today",
    newEvent: "New Event",
    addEvent: "Add Event",
    createNewEvent: "Create New Event",
    createEvent: "Create Event",
    creating: "Creating...",
    cancel: "Cancel",
    selectedDay: "Selected Day",
    scheduleOutlook: "Schedule Outlook",
    upcomingEvents: "Upcoming Events",
    noUpcomingEvents: "No upcoming events",
    nothingScheduled: "Nothing scheduled for this day.",
    selectAnotherDate:
      "Select another date or create an event for this day.",
    tapDay: "Tap a day to review scheduled events.",
    events: "Events",
    projects: "Projects",
    high: "High",
    loadingCalendarEvents: "Loading calendar events...",
    eventSetup: "Event Setup",
    scheduleEvent: "Schedule Event",
    eventPopupDescription:
      "Create a scheduled event and choose or type a custom event type.",
    eventSetupSubtitle:
      "Assign project, users, priority, details, and choose or create an event type.",
    dateAndTime: "Date & Time",
    project: "Project",
    selectProject: "Select a project",
    assignedTo: "Assigned To",
    noUsersAvailable: "No users available",
    usersSelected: "user(s) selected",
    eventType: "Event Type",
    selectExistingEventType: "Select existing event type",
    typeNewEventType: "Or type a new event type",
    eventTypeHelp:
      "Contractors can choose an existing event type or type a new one, like “Cabinet Delivery”, “Final Walkthrough”, or “Client Selection Meeting”.",
    priority: "Priority",
    selectPriority: "Select priority",
    description: "Description",
    enterEventDetails: "Enter event details...",
    calendarEvent: "Calendar event",
    unassignedProject: "Unassigned project",
    requiredEventFields:
      "Please fill in date, project, and assigned users.",
    failedCreateEvent: "Failed to create event",
    sendMessage: "Send Message",
    typeMessage: "Type a message...",
    noMessages: "No messages yet.",
    messageThread: "Message Thread",
    projectMessages: "Project Messages",
    attachFile: "Attach File",
    spanish: "Spanish",
    english: "English",
  },
  es: {
    calendar: "Calendario",
    messages: "Mensajes",
    enterpriseWorkspace: "Espacio de trabajo empresarial",
    calendarDescription:
      "Vea eventos de obra, inspecciones, reuniones, fechas límite y trabajo asignado por día.",
    today: "Hoy",
    newEvent: "Nuevo evento",
    addEvent: "Agregar evento",
    createNewEvent: "Crear nuevo evento",
    createEvent: "Crear evento",
    creating: "Creando...",
    cancel: "Cancelar",
    selectedDay: "Día seleccionado",
    scheduleOutlook: "Vista del calendario",
    upcomingEvents: "Próximos eventos",
    noUpcomingEvents: "No hay próximos eventos",
    nothingScheduled: "No hay nada programado para este día.",
    selectAnotherDate:
      "Seleccione otra fecha o cree un evento para este día.",
    tapDay: "Toque un día para revisar los eventos programados.",
    events: "Eventos",
    projects: "Proyectos",
    high: "Alta",
    loadingCalendarEvents: "Cargando eventos del calendario...",
    eventSetup: "Configuración del evento",
    scheduleEvent: "Programar evento",
    eventPopupDescription:
      "Cree un evento programado y elija o escriba un tipo de evento personalizado.",
    eventSetupSubtitle:
      "Asigne proyecto, usuarios, prioridad, detalles y elija o cree un tipo de evento.",
    dateAndTime: "Fecha y hora",
    project: "Proyecto",
    selectProject: "Seleccione un proyecto",
    assignedTo: "Asignado a",
    noUsersAvailable: "No hay usuarios disponibles",
    usersSelected: "usuario(s) seleccionado(s)",
    eventType: "Tipo de evento",
    selectExistingEventType: "Seleccione un tipo de evento existente",
    typeNewEventType: "O escriba un nuevo tipo de evento",
    eventTypeHelp:
      "Los contratistas pueden elegir un tipo de evento existente o escribir uno nuevo, como “Entrega de gabinetes”, “Recorrido final” o “Reunión de selección del cliente”.",
    priority: "Prioridad",
    selectPriority: "Seleccione prioridad",
    description: "Descripción",
    enterEventDetails: "Ingrese los detalles del evento...",
    calendarEvent: "Evento del calendario",
    unassignedProject: "Proyecto sin asignar",
    requiredEventFields:
      "Complete la fecha, el proyecto y los usuarios asignados.",
    failedCreateEvent: "No se pudo crear el evento",
    sendMessage: "Enviar mensaje",
    typeMessage: "Escriba un mensaje...",
    noMessages: "Aún no hay mensajes.",
    messageThread: "Conversación",
    projectMessages: "Mensajes del proyecto",
    attachFile: "Adjuntar archivo",
    spanish: "Español",
    english: "Inglés",
  },
} satisfies Record<Language, Dictionary>

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: keyof typeof translations.en) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("app-language")

    if (savedLanguage === "en" || savedLanguage === "es") {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    window.localStorage.setItem("app-language", nextLanguage)
  }

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "es" : "en")
  }

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: (key) => {
        const translated = translations[language][key]

        if (typeof translated === "string") {
          return translated
        }

        return String(key)
      },
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider")
  }

  return context
}