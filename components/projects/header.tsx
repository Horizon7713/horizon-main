import {
  Building2,
  CalendarDays,
  DollarSign,
  PencilLine,
  Ruler,
  Users,
  Bath,
  DoorOpen,
  PanelsTopLeft,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProjectHeaderProps {
  name: string
  startDate: string | null
  endDate: string | null
  memberCount: number
  budget: number | null
  remainingBudget: number | null
  squareFeet?: number | null
  bathroomCount?: number | null
  windowCount?: number | null
  doorCount?: number | null
  cabinetCount?: number | null
  onEditProject?: () => void
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black">
      <div className="absolute inset-x-0 top-0 h-px bg-zinc-700" />
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
          <div className="mt-2 text-sm font-semibold text-zinc-100">
            {value}
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
          {Icon ? <Icon className="h-4 w-4 text-zinc-300" /> : null}
        </div>
      </div>
    </div>
  )
}

export function ProjectHeader({
  name,
  startDate,
  endDate,
  memberCount,
  budget,
  remainingBudget,
  squareFeet,
  bathroomCount,
  windowCount,
  doorCount,
  cabinetCount,
  onEditProject,
}: ProjectHeaderProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-950 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Project Overview
            </div>

            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-black">
                <Building2 className="h-5 w-5 text-zinc-200" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-zinc-100 md:text-3xl">
                  {name}
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Project summary, budget snapshot, and scheduling inputs.
                </p>
              </div>
            </div>
          </div>

          {onEditProject ? (
            <Button
              variant="outline"
              onClick={onEditProject}
              className="h-10 rounded-lg border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            >
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Project Snapshot
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricTile
              label="Start Date"
              value={formatDate(startDate)}
              icon={CalendarDays}
            />
            <MetricTile
              label="End Date"
              value={formatDate(endDate)}
              icon={CalendarDays}
            />
            <MetricTile
              label="Budget"
              value={formatCurrency(budget)}
              icon={DollarSign}
            />
            <MetricTile
              label="Remaining"
              value={formatCurrency(remainingBudget)}
              icon={DollarSign}
            />
            <MetricTile
              label="Members"
              value={memberCount}
              icon={Users}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
              <Ruler className="h-4 w-4 text-zinc-300" />
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Scheduling Inputs
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">
                Quantity-Based Planning Inputs
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                These values are used to calculate quantity-based task durations.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricTile
              label="Square Feet"
              value={squareFeet ?? "N/A"}
              icon={Ruler}
            />
            <MetricTile
              label="Bathrooms"
              value={bathroomCount ?? "N/A"}
              icon={Bath}
            />
            <MetricTile
              label="Windows"
              value={windowCount ?? "N/A"}
              icon={PanelsTopLeft}
            />
            <MetricTile
              label="Doors"
              value={doorCount ?? "N/A"}
              icon={DoorOpen}
            />
            <MetricTile
              label="Cabinets"
              value={cabinetCount ?? "N/A"}
              icon={Package}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
