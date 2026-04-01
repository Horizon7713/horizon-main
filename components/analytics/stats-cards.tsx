'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FileText, Layers, AlertTriangle, Activity } from 'lucide-react'

interface StatsCardsProps {
  stats: Record<string, number> | null
}

const STAT_ITEMS = [
  { key: 'totalMarkups', label: 'Markups', icon: Layers, color: 'text-primary' },
  { key: 'totalEvents', label: 'Events', icon: Activity, color: 'text-chart-2' },
  { key: 'pagesAffected', label: 'Pages', icon: FileText, color: 'text-chart-4' },
  { key: 'conflictCount', label: 'Conflicts', icon: AlertTriangle, color: 'text-destructive' },
]

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon
        const value = stats?.[item.key] ?? 0
        return (
          <Card key={item.key}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-md bg-secondary ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground font-mono">{value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
