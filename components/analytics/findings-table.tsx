'use client'

import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface Finding {
  id: string
  category: string
  severity: string
  title: string
  description: string
  page_number: number | null
  suggested_action: string | null
  affected_markup_ids: string[]
}

interface FindingsTableProps {
  findings: Finding[]
  loading: boolean
}

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
  info: 'outline',
}

const CATEGORY_LABEL: Record<string, string> = {
  conflict: 'Conflict',
  inconsistency: 'Inconsistency',
  revision_delta: 'Revision',
  risk: 'Risk',
  suggestion: 'Suggestion',
  heatmap: 'Hotspot',
}

export function FindingsTable({ findings, loading }: FindingsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (findings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No findings for this analysis run.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Severity</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Category</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Finding</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Page</th>
            <th className="pb-3 font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={f.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
              <td className="py-3 pr-4">
                <Badge variant={SEVERITY_VARIANT[f.severity] ?? 'secondary'} className="text-xs capitalize">
                  {f.severity}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABEL[f.category] ?? f.category}
                </span>
              </td>
              <td className="py-3 pr-4">
                <div className="flex flex-col gap-0.5 max-w-md">
                  <span className="font-medium text-foreground">{f.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{f.description}</span>
                </div>
              </td>
              <td className="py-3 pr-4">
                {f.page_number != null ? (
                  <span className="font-mono text-xs text-foreground">{f.page_number}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </td>
              <td className="py-3">
                {f.suggested_action ? (
                  <span className="text-xs text-primary">{f.suggested_action}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
