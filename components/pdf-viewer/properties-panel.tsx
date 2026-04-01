'use client'

import { Markup, MarkupStyle, DistanceMarkup, AreaMarkup } from '@/lib/pdf-viewer-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface PropertiesPanelProps {
  markup: Markup | null
  onStyleChange: (style: Partial<MarkupStyle>) => void
  onDelete: () => void
}

export function PropertiesPanel({ markup, onStyleChange, onDelete }: PropertiesPanelProps) {
  if (!markup) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Select a markup to edit properties</p>
        </CardContent>
      </Card>
    )
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStyleChange({ strokeColor: e.target.value })
  }

  const handleStrokeWidthChange = (value: number[]) => {
    onStyleChange({ strokeWidth: value[0] })
  }

  const handleOpacityChange = (value: number[]) => {
    onStyleChange({ opacity: value[0] })
  }

  const handleFillColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStyleChange({ fillColor: e.target.value })
  }

  const handleFontSizeChange = (value: number[]) => {
    onStyleChange({ fontSize: value[0] })
  }

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStyleChange({ fontFamily: e.target.value })
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Properties</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <Label className="text-xs">Type: {markup.type.charAt(0).toUpperCase() + markup.type.slice(1)}</Label>
          <Label className="text-xs text-muted-foreground">Page: {markup.pageNumber}</Label>
          <Label className="text-xs text-muted-foreground">Author: {markup.author || 'Unknown'}</Label>
        </div>

        {/* Measurement Data */}
        {markup.type === 'distance' && (
          <div className="bg-muted p-3 rounded space-y-2">
            <Label className="text-xs font-semibold">Distance Measurement</Label>
            <div className="text-xs">
              <p>Pixel Distance: {(markup as DistanceMarkup).pixelDistance.toFixed(2)} px</p>
              {(markup as DistanceMarkup).measuredDistance && (
                <p>
                  Real Distance: {(markup as DistanceMarkup).measuredDistance?.toFixed(2)} {(markup as DistanceMarkup).unit}
                </p>
              )}
            </div>
          </div>
        )}

        {markup.type === 'area' && (
          <div className="bg-muted p-3 rounded space-y-2">
            <Label className="text-xs font-semibold">Area Measurement</Label>
            <div className="text-xs">
              <p>Pixel Area: {(markup as AreaMarkup).pixelArea.toFixed(2)} sq px</p>
              {(markup as AreaMarkup).measuredArea && (
                <p>
                  Real Area: {(markup as AreaMarkup).measuredArea?.toFixed(2)} sq {(markup as AreaMarkup).unit}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="stroke-color" className="text-xs">
            Stroke Color
          </Label>
          <div className="flex gap-2">
            <Input
              id="stroke-color"
              type="color"
              value={markup.style.strokeColor}
              onChange={handleColorChange}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={markup.style.strokeColor}
              onChange={handleColorChange}
              className="flex-1 text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stroke-width" className="text-xs">
            Stroke Width: {markup.style.strokeWidth}px
          </Label>
          <Slider
            id="stroke-width"
            min={1}
            max={10}
            step={1}
            value={[markup.style.strokeWidth]}
            onValueChange={handleStrokeWidthChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="opacity" className="text-xs">
            Opacity: {Math.round(markup.style.opacity * 100)}%
          </Label>
          <Slider
            id="opacity"
            min={0}
            max={1}
            step={0.1}
            value={[markup.style.opacity]}
            onValueChange={handleOpacityChange}
          />
        </div>

        {(markup.type === 'rectangle' || markup.type === 'ellipse') && (
          <div className="space-y-2">
            <Label htmlFor="fill-color" className="text-xs">
              Fill Color
            </Label>
            <div className="flex gap-2">
              <Input
                id="fill-color"
                type="color"
                value={markup.style.fillColor || '#FF0000'}
                onChange={handleFillColorChange}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={markup.style.fillColor || '#FF0000'}
                onChange={handleFillColorChange}
                className="flex-1 text-xs"
              />
            </div>
          </div>
        )}

        {markup.type === 'text' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="font-family" className="text-xs">
                Font Family
              </Label>
              <select
                id="font-family"
                value={markup.style.fontFamily || 'Arial'}
                onChange={handleFontFamilyChange}
                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background"
              >
                <option>Arial</option>
                <option>Times New Roman</option>
                <option>Courier New</option>
                <option>Georgia</option>
                <option>Verdana</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size" className="text-xs">
                Font Size: {markup.style.fontSize}px
              </Label>
              <Slider
                id="font-size"
                min={8}
                max={48}
                step={1}
                value={[markup.style.fontSize || 14]}
                onValueChange={handleFontSizeChange}
              />
            </div>
          </>
        )}

        <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
          <div>Created: {new Date(markup.createdAt).toLocaleString()}</div>
          <div>ID: {markup.id}</div>
        </div>
      </CardContent>
    </Card>
  )
}
