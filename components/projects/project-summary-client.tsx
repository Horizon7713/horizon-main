"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProjectHeader } from "@/components/projects/header"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"
import { updateProject } from "@/app/project_data/actions"

interface ProjectSummaryClientProps {
  project: {
    id: string
    name: string
    start_date: string | null
    end_date: string | null
    budget: number | null
    square_feet: number | null
    bathroom_count: number | null
    window_count: number | null
    door_count: number | null
    cabinet_count: number | null
  }
  memberCount: number
  remainingBudget: number | null
}

export function ProjectSummaryClient({
  project,
  memberCount,
  remainingBudget,
}: ProjectSummaryClientProps) {
  const [editOpen, setEditOpen] = useState(false)
  const router = useRouter()

  const handleSaved = async () => {
    router.refresh()
  }

  return (
    <>
      <ProjectHeader
        name={project.name}
        startDate={project.start_date}
        endDate={project.end_date}
        memberCount={memberCount}
        budget={project.budget}
        remainingBudget={remainingBudget}
        squareFeet={project.square_feet}
        bathroomCount={project.bathroom_count}
        windowCount={project.window_count}
        doorCount={project.door_count}
        cabinetCount={project.cabinet_count}
        onEditProject={() => setEditOpen(true)}
      />

      <EditProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        updateProject={updateProject}
        onSaved={handleSaved}
      />
    </>
  )
}