'use client'

import React, { Suspense, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, BarChart3, AlertTriangle, Shield, Lightbulb, Activity, MapPin } from 'lucide-react'
import { AnalyticsHeatmap } from '@/components/analytics/heatmap'
import { FindingsTable } from '@/components/analytics/findings-table'
import { StatsCards } from '@/components/analytics/stats-cards'

async function fetchRuns(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function fetchFindings(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function AnalyticsPageContent() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get('documentId')
  const [isRunning, setIsRunning] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const { data: runs, isLoading: runsLoading } = useSWR(
    documentId ? `/api/analytics/runs?documentId=${documentId}` : null,
    fetchRuns
  )

  const { data: findings, isLoading: findingsLoading } = useSWR(
    selectedRunId ? `/api/analytics/findings?runId=${selectedRunId}` : null,
    fetchFindings
  )

  const handleRunAnalysis = useCallback(async () => {
    if (!documentId) return
    setIsRunning(true)
    try {
      const res = await fetch('/api/analytics/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      const result = await res.json()
      if (result.id) {
        setSelectedRunId(result.id)
        mutate(`/api/analytics/runs?documentId=${documentId}`)
      }
    } finally {
      setIsRunning(false)
    }
  }, [documentId])

  const latestRun = runs?.[0]
  const activeRun = selectedRunId
    ? runs?.find((r: { id: string }) => r.id === selectedRunId)
    : latestRun

  if (!documentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No Document Selected</h2>
            <p className="text-sm text-muted-foreground">
              Open a document from the Plan Viewer and click "Analytics" to analyze it.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight text-balance">
              Document Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {documentId.slice(0, 8)}...
            </p>
          </div>
          <div className="flex items-center gap-3">
            {runs && runs.length > 0 && (
              <select
                value={selectedRunId ?? latestRun?.id ?? ''}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="h-9 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
                aria-label="Select analysis run"
              >
                {runs.map((r: { id: string; created_at: string; status: string }) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.created_at).toLocaleString()} ({r.status})
                  </option>
                ))}
              </select>
            )}
            <Button onClick={handleRunAnalysis} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {runsLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No runs yet */}
        {!runsLoading && (!runs || runs.length === 0) && (
          <Card>
            <CardContent className="py-16 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No analysis runs yet. Click "Run Analysis" to start.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {activeRun && (
          <>
            {/* Summary */}
            {activeRun.summary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-chart-4" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {activeRun.summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <StatsCards stats={activeRun.stats} />

            {/* Grid: Heatmap + Severity Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Heatmap */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-chart-1" />
                    Activity Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsHeatmap data={activeRun.heatmap_data ?? []} />
                </CardContent>
              </Card>

              {/* Severity breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Findings by Severity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SeverityBreakdown findings={findings ?? []} loading={findingsLoading} />
                </CardContent>
              </Card>
            </div>

            {/* Findings Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Findings ({findings?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FindingsTable findings={findings ?? []} loading={findingsLoading} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Severity breakdown sub-component
// ---------------------------------------------------------------------------
const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  low: { label: 'Low', color: 'bg-blue-500' },
  info: { label: 'Info', color: 'bg-muted-foreground' },
}

function SeverityBreakdown({
  findings,
  loading,
}: {
  findings: { severity: string }[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const counts: Record<string, number> = {}
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1
  }

  const total = findings.length || 1

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
        const count = counts[key] ?? 0
        const pct = Math.round((count / total) * 100)
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{cfg.label}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {count}
                </Badge>
                <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${cfg.color} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-6" />}>
      <AnalyticsPageContent />
    </Suspense>
  )
}