"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CheckIcon, XIcon, ChevronDownIcon } from "lucide-react"
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
}) => Promise<{ success: boolean; error?: string }>
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
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
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
})

      if (result.success) {
        // Reset form
        setFormData({
          name: "",
          status: "active",
          startDate: "",
          endDate: "",
          company: "",
          budget: "",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Project Name</Label>
        <div className="space-y-2">
  <Label htmlFor="projectType">Project Type</Label>
  <Select
    value={formData.projectType}
    onValueChange={(value) => setFormData({ ...formData, projectType: value })}
  >
    <SelectTrigger id="projectType" className="w-full">
      <SelectValue placeholder="Select project type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="new_construction">New Construction</SelectItem>
      <SelectItem value="remodel">Remodel</SelectItem>
      <SelectItem value="addition">Addition</SelectItem>
      <SelectItem value="detached_garage">Detached Garage</SelectItem>
      <SelectItem value="tenant_improvement">Tenant Improvement</SelectItem>
    </SelectContent>
  </Select>
</div>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter project name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          placeholder="Enter company name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget (Optional)</Label>
        <Input
          id="budget"
          type="number"
          step="0.01"
          min="0"
          value={formData.budget}
          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          placeholder="Enter project budget"
        />
      </div>

      <div className="space-y-2">
        <Label>Assign Users</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-auto min-h-9 bg-transparent"
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
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search users..." />
              <CommandList>
                <CommandEmpty>{loadingUsers ? "Loading users..." : "No users found."}</CommandEmpty>
                <CommandGroup>
                  {users.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.first_name} ${user.last_name} ${user.email}`}
                      onSelect={() => toggleUser(user.id)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedUserIds.includes(user.id)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {user.first_name} {user.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
              >
                <span>
                  {user.first_name} {user.last_name}
                </span>
                <button
                  type="button"
                  onClick={() => removeUser(user.id)}
                  className="hover:bg-primary/20 rounded-sm p-0.5"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  )
}
