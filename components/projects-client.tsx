"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popup } from "@/components/popup"
import { FormNewProject } from "@/components/form/form-newproject"
import { FolderPlus, Plus } from "lucide-react"

interface ProjectsClientProps {
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

export function ProjectsClient({ createProject }: ProjectsClientProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const handleSuccess = () => {
    setIsPopupOpen(false)
  }

  return (
    <>
      <Button
        onClick={() => setIsPopupOpen(true)}
        className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
      >
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>

      <Popup
        open={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        title="Create New Project"
        description="Fill in the details to create a new project"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                <FolderPlus className="h-4 w-4 text-zinc-300" />
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Project Setup
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  New Construction Workspace
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Create a project record, assign users, and initialize task structure.
                </div>
              </div>
            </div>
          </div>

          <FormNewProject
            createProject={createProject}
            onSuccess={handleSuccess}
            onCancel={() => setIsPopupOpen(false)}
          />
        </div>
      </Popup>
    </>
  )
}
