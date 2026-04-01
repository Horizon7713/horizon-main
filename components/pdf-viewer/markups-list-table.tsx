'use client'

import React, { useState } from 'react'
import { Markup, DistanceMarkup, AreaMarkup, PageScale } from '@/lib/pdf-viewer-types'
import { getDistanceLabel, getAreaLabel, getRealWorldValue, getPageInchesPerPixel } from '@/lib/pdf-measurement-utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkupsListTableProps {
  markups: Markup[]
  selectedMarkupId: string | null
  onMarkupSelect: (id: string | null) => void
  onMarkupDelete: (id: string) => void
  /** Current per-page calibration scales for render-time label computation */
  pageScales?: PageScale[]
}

type SortColumn = 'page' | 'type' | 'measurement' | 'status' | 'author' | 'date'
type SortOrder = 'asc' | 'desc'

export function MarkupsListTable({
  markups,
  selectedMarkupId,
  onMarkupSelect,
  onMarkupDelete,
  pageScales = [],
}: MarkupsListTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('page')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortOrder('asc')
    }
  }

  /** Render-time label — never reads stored strings. */
  const getMeasurementLabel = (markup: Markup): string => {
    const ipp = getPageInchesPerPixel(pageScales, markup.pageNumber)
    if (markup.type === 'distance') {
      return getDistanceLabel((markup as DistanceMarkup).pixelDistance, ipp)
    }
    if (markup.type === 'area') {
      return getAreaLabel((markup as AreaMarkup).pixelArea, ipp)
    }
    return '-'
  }

  const sortedMarkups = [...markups].sort((a, b) => {
    let aVal: string | number = ''
    let bVal: string | number = ''

    switch (sortColumn) {
      case 'page':
        aVal = a.pageNumber; bVal = b.pageNumber; break
      case 'type':
        aVal = a.type; bVal = b.type; break
      case 'measurement':
        // Sort by numeric real-world value (inches for distance, sq ft for area)
        aVal = getRealWorldValue(a as any, pageScales)
        bVal = getRealWorldValue(b as any, pageScales)
        break
      case 'status':
        aVal = a.status || 'draft'; bVal = b.status || 'draft'; break
      case 'author':
        aVal = a.author || 'Unknown'; bVal = b.author || 'Unknown'; break
      case 'date':
        aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime(); break
    }

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
    }
    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null
    return sortOrder === 'asc' ? <ChevronUp className="inline w-4 h-4 ml-1" /> : <ChevronDown className="inline w-4 h-4 ml-1" />
  }

  return (
    <div className="border-t bg-background">
      <div className="overflow-auto max-h-40">
        <Table>
          <TableHeader className="sticky top-0 bg-muted">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => handleSort('page')}>Page <SortIcon column="page" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => handleSort('type')}>Type <SortIcon column="type" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => handleSort('measurement')}>Measurement <SortIcon column="measurement" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => handleSort('status')}>Status <SortIcon column="status" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => handleSort('author')}>Author <SortIcon column="author" /></TableHead>
              <TableHead className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => handleSort('date')}>Date <SortIcon column="date" /></TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMarkups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                  No markups yet. Start by selecting a tool and drawing on the PDF.
                </TableCell>
              </TableRow>
            ) : (
              sortedMarkups.map((markup) => (
                <TableRow
                  key={markup.id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/50 transition-colors',
                    selectedMarkupId === markup.id && 'bg-primary/10 border-l-2 border-l-primary',
                  )}
                  onClick={() => onMarkupSelect(markup.id)}
                >
                  <TableCell>{markup.pageNumber}</TableCell>
                  <TableCell className="capitalize">{markup.type}</TableCell>
                  <TableCell>{getMeasurementLabel(markup)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-secondary text-secondary-foreground">
                      {markup.status || 'draft'}
                    </span>
                  </TableCell>
                  <TableCell>{markup.author || 'Unknown'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(markup.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onMarkupDelete(markup.id) }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
