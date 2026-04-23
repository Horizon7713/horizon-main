"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  Building2,
  CalendarDays,
  DollarSign,
  Users,
  Ruler,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string
}

interface FormNewProjectProps {
  onSuccess?: () => void
  onCancel?: () => void
  createProject: (data: {
    name: string
    status: string
    startDate: string
    endDate: string
    users: string[]
    company: string
    budget?: number
    projectType: string
    squareFeet?: number
    bathroomCount?: number
    windowCount?: number
    doorCount?: number
    cabinetCount?: number
  }) => Promise<{ success: boolean; error?: string }>
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
    <div className="mb-3 flex items-start gap-3 sm:mb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 text-zinc-300" />
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {eyebrow}
        </div>
        <div className="mt-1 text-sm font-semibold text-zinc-100 sm:text-base">{title}</div>
        <div className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</div>
      </div>
    </div>
  )
}

export function FormNewProject({ onSuccess, onCancel, createProject }: FormNewProjectProps) {
  const [formData, setFormData] = useState({
    name: "",
    status: "active",
    startDate: "",
    endDate: "",
    company: "",
    budget: "",
    projectType: "new_construction",
    squareFeet: "",
    bathroomCount: "",
    windowCount: "",
    doorCount: "",
    cabinetCount: "",
  })

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, first_name, last_name, email, company")
          .order("first_name")

        if (error) {
          console.error("[v0] Error fetching users:", error)
        } else {
          setUsers(data || [])
        }
      } catch (err) {
        console.error("[v0] Error fetching users:", err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const removeUser = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId))
  }

  const selectedUsers = users.filter((user) => selectedUserIds.includes(user.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createProject({
        name: formData.name,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        users: selectedUserIds,
        company: formData.company,
        budget: formData.budget ? Number.parseFloat(formData.budget) : undefined,
        projectType: formData.projectType,
        squareFeet: formData.squareFeet ? Number.parseFloat(formData.squareFeet) : undefined,
        bathroomCount: formData.bathroomCount ? Number.parseInt(formData.bathroomCount, 10) : undefined,
        windowCount: formData.windowCount ? Number.parseInt(formData.windowCount, 10) : undefined,
        doorCount: formData.doorCount ? Number.parseInt(formData.doorCount, 10) : undefined,
        cabinetCount: formData.cabinetCount ? Number.parseInt(formData.cabinetCount, 10) : undefined,
      })

      if (result.success) {
        setFormData({
          name: "",
          status: "active",
          startDate: "",
          endDate: "",
          company: "",
          budget: "",
          projectType: "new_construction",
          squareFeet: "",
          bathroomCount: "",
          windowCount: "",
          doorCount: "",
          cabinetCount: "",
        })
        setSelectedUserIds([])
        onSuccess?.()
      } else {
        setError(result.error || "Failed to create project")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputClassName =
    "h-10 sm:h-11 rounded-xl border-zinc-800 bg-black text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-700"

  const triggerClassName = "h-10 sm:h-11 w-full rounded-xl border-zinc-800 bg-black text-zinc-100"

  return (
    <form
  onSubmit={handleSubmit}
  className="max-h-[75vh] overflow-y-auto space-y-4 pr-1 pb-6 sm:max-h-[80vh] sm:space-y-5"
>
      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-black p-3 sm:p-4">
        <SectionHeader
          icon={Building2}
          eyebrow="Project Core"
          title="Primary Project Details"
          subtitle="Set the project basics, schedule, company, and budget."
        />

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="projectType" className="text-zinc-300">
              Project Type
            </Label>
            <Select
              value={formData.projectType}
              onValueChange={(value) => setFormData({ ...formData, projectType: value })}
            >
              <SelectTrigger id="projectType" className={triggerClassName}>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="new_construction">New Construction</SelectItem>
                <SelectItem value="remodel">Remodel</SelectItem>
                <SelectItem value="addition">Addition</SelectItem>
                <SelectItem value="detached_garage">Detached Garage</SelectItem>
                <SelectItem value="tenant_improvement">Tenant Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-zinc-300">
              Status
            </Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger id="status" className={triggerClassName}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name" className="text-zinc-300">
              Project Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-zinc-300">
              Company
            </Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Enter company name"
              required
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="text-zinc-300">
              Budget
            </Label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="Enter project budget"
                className={`${inputClassName} pl-9`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-zinc-300">
              Start Date
            </Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className={`${inputClassName} pl-9`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-zinc-300">
              End Date
            </Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                className={`${inputClassName} pl-9`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-black p-3 sm:p-4">
        <SectionHeader
          icon={Ruler}
          eyebrow="Scheduling Inputs"
          title="Project Quantity Inputs"
          subtitle="Use quantity inputs for better schedule and scope planning."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="squareFeet" className="text-zinc-300">
              Square Feet
            </Label>
            <Input
              id="squareFeet"
              type="number"
              min="0"
              step="0.01"
              value={formData.squareFeet}
              onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
              placeholder="e.g. 2400"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bathroomCount" className="text-zinc-300">
              Bathrooms
            </Label>
            <Input
              id="bathroomCount"
              type="number"
              min="0"
              step="1"
              value={formData.bathroomCount}
              onChange={(e) => setFormData({ ...formData, bathroomCount: e.target.value })}
              placeholder="e.g. 3"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="windowCount" className="text-zinc-300">
              Windows
            </Label>
            <Input
              id="windowCount"
              type="number"
              min="0"
              step="1"
              value={formData.windowCount}
              onChange={(e) => setFormData({ ...formData, windowCount: e.target.value })}
              placeholder="e.g. 18"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doorCount" className="text-zinc-300">
              Doors
            </Label>
            <Input
              id="doorCount"
              type="number"
              min="0"
              step="1"
              value={formData.doorCount}
              onChange={(e) => setFormData({ ...formData, doorCount: e.target.value })}
              placeholder="e.g. 14"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cabinetCount" className="text-zinc-300">
              Cabinets
            </Label>
            <Input
              id="cabinetCount"
              type="number"
              min="0"
              step="1"
              value={formData.cabinetCount}
              onChange={(e) => setFormData({ ...formData, cabinetCount: e.target.value })}
              placeholder="e.g. 22"
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-black p-3 sm:p-4">
        <SectionHeader
          icon={Users}
          eyebrow="Assignments"
          title="Assign Project Users"
          subtitle="Choose who should have access to this project."
        />

        <div className="space-y-2">
          <Label className="text-zinc-300">Users</Label>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-auto min-h-10 w-full justify-between rounded-xl border-zinc-800 bg-black px-3 py-2 text-left text-zinc-100 hover:border-zinc-700 hover:bg-zinc-950"
                type="button"
              >
                <span className="truncate">
                  {selectedUserIds.length === 0
                    ? "Select users..."
                    : `${selectedUserIds.length} user${selectedUserIds.length > 1 ? "s" : ""} selected`}
                </span>
                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
              align="start"
            >
              <Command className="bg-zinc-950 text-zinc-100">
                <CommandInput placeholder="Search users..." className="border-zinc-800" />
                <CommandList>
                  <CommandEmpty>{loadingUsers ? "Loading users..." : "No users found."}</CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={`${user.first_name} ${user.last_name} ${user.email}`}
                        onSelect={() => toggleUser(user.id)}
                        className="aria-selected:bg-zinc-900 aria-selected:text-zinc-100"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-zinc-700",
                            selectedUserIds.includes(user.id)
                              ? "bg-zinc-100 text-zinc-950"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="truncate text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedUsers.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200"
                >
                  <span className="truncate">
                    {user.first_name} {user.last_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeUser(user.id)}
                    className="shrink-0 rounded-sm p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 sm:w-auto"
          >
            Cancel
          </Button>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="w-full border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800 sm:w-auto"
        >
          {loading ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  )
}
