"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popup } from "@/components/popup"
import { FormNewProject } from "@/components/form/form-newproject"
import { Plus } from "lucide-react"

interface ProjectsClientProps {
  createProject: (data: {
    name: string
    status: string
    startDate: string
    endDate: string
    users: string[]
    company: string
    projectType: string
  }) => Promise<{ success: boolean; error?: string }>
}

export function ProjectsClient({ createProject }: ProjectsClientProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const handleSuccess = () => {
    setIsPopupOpen(false)
    // The page will automatically refresh due to revalidatePath in the server action
  }

  return (
    <>
      <Button onClick={() => setIsPopupOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </Button>

      <Popup
        open={isPopupOpen}
        onOpenChange={setIsPopupOpen}
        title="Create New Project"
        description="Fill in the details to create a new project"
      >
        <FormNewProject
          createProject={createProject}
          onSuccess={handleSuccess}
          onCancel={() => setIsPopupOpen(false)}
        />
      </Popup>
    </>
  )
}
