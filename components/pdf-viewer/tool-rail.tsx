'use client'

import { MarkupType } from '@/lib/pdf-viewer-types'
import { Button } from '@/components/ui/button'
import {
  Pointer,
  Minus,
  Square,
  Circle,
  Type,
  Pen,
  Download,
  Plus,
  Trash2,
  Ruler,
  Maximize2,
  ScalingIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolRailProps {
  activeTool: MarkupType | null
  onToolSelect: (tool: MarkupType) => void
  onClear: () => void
  onExport: () => void
  onAddPDF?: () => void
}

const tools: Array<{ tool: MarkupType; icon: React.ReactNode; label: string }> = [
  { tool: 'select', icon: <Pointer className="w-5 h-5" />, label: 'Select' },
  { tool: 'line', icon: <Minus className="w-5 h-5" />, label: 'Line' },
  { tool: 'rectangle', icon: <Square className="w-5 h-5" />, label: 'Rectangle' },
  { tool: 'ellipse', icon: <Circle className="w-5 h-5" />, label: 'Ellipse' },
  { tool: 'text', icon: <Type className="w-5 h-5" />, label: 'Text' },
  { tool: 'polyline', icon: <Pen className="w-5 h-5" />, label: 'Polyline' },
  { tool: 'distance', icon: <Ruler className="w-5 h-5" />, label: 'Distance' },
  { tool: 'area', icon: <Maximize2 className="w-5 h-5" />, label: 'Area' },
  { tool: 'calibrate', icon: <ScalingIcon className="w-5 h-5" />, label: 'Calibrate Scale' },
]

export function ToolRail({ activeTool, onToolSelect, onClear, onExport, onAddPDF }: ToolRailProps) {
  return (
    <div className="flex flex-col h-full bg-background border-r border-border p-2 gap-2">
      <div className="flex flex-col gap-1">
        {tools.map(({ tool, icon, label }) => (
          <Button
            key={tool}
            variant="ghost"
            size="icon"
            onClick={() => onToolSelect(tool)}
            className={cn(
              'h-10 w-10 p-0 rounded-md transition-colors',
              activeTool === tool && 'bg-primary text-primary-foreground hover:bg-primary'
            )}
            title={label}
          >
            {icon}
          </Button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 border-t border-border pt-2">
        {onAddPDF && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddPDF}
            className="h-10 w-10 p-0 rounded-md hover:bg-muted"
            title="Add PDF"
          >
            <Plus className="w-5 h-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onExport}
          className="h-10 w-10 p-0 rounded-md hover:bg-muted"
          title="Export Markups"
        >
          <Download className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-10 w-10 p-0 rounded-md hover:bg-destructive hover:text-destructive-foreground"
          title="Clear All"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
