"use client"

import { useState } from "react"
import { Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface DeleteProjectButtonProps {
  projectId: string
  projectName: string
  deleteProject: (projectId: string) => Promise<{ success: boolean; error?: string }>
}

export function DeleteProjectButton({
  projectId,
  projectName,
  deleteProject,
}: DeleteProjectButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsDeleting(true)
    console.log("[v0] Deleting project:", projectId)

    try {
      const result = await deleteProject(projectId)

      if (result.success) {
        toast({
          title: "Project deleted",
          description: `${projectName} has been successfully deleted.`,
        })
        setOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete project",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting project:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg border border-zinc-800 bg-black text-zinc-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete project</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
        <AlertDialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-300" />
          </div>

          <AlertDialogTitle className="text-lg font-semibold text-zinc-100">
            Delete project?
          </AlertDialogTitle>

          <AlertDialogDescription className="text-sm leading-6 text-zinc-400">
            This will permanently delete{" "}
            <span className="font-semibold text-zinc-100">{projectName}</span> and all
            associated data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
          >
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
          >
            {isDeleting ? "Deleting..." : "Delete Project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
