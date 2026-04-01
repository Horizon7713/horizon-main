interface ProjectHeaderProps {
  name: string
  startDate: string | null
  endDate: string | null
  memberCount: number
  budget: number | null
  remainingBudget: number | null // Added remainingBudget prop
}

export function ProjectHeader({ name, startDate, endDate, memberCount, budget, remainingBudget }: ProjectHeaderProps) {
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
    <div className="border-b border-gray-200 pb-6">
      <h1 className="text-3xl font-bold mb-4">{name}</h1>
      <div className="flex gap-8 text-sm">
        <div>
          <span className="text-gray-500">Start Date:</span>
          <span className="ml-2 font-medium">{formatDate(startDate)}</span>
        </div>
        <div>
          <span className="text-gray-500">End Date:</span>
          <span className="ml-2 font-medium">{formatDate(endDate)}</span>
        </div>
        <div>
          <span className="text-gray-500">Budget:</span>
          <span className="ml-2 font-medium">{formatCurrency(budget)}</span>
        </div>
        <div>
          <span className="text-gray-500">Remaining:</span>
          <span className="ml-2 font-medium">{formatCurrency(remainingBudget)}</span>
        </div>
        <div>
          <span className="text-gray-500">Members:</span>
          <span className="ml-2 font-medium">{memberCount}</span>
        </div>
      </div>
    </div>
  )
}
