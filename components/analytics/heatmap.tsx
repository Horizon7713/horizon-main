'use client'

import React, { useRef, useEffect } from 'react'

interface HeatmapPoint {
  pageNumber: number
  x: number
  y: number
  intensity: number
  reason: string
}

interface AnalyticsHeatmapProps {
  data: HeatmapPoint[]
}

export function AnalyticsHeatmap({ data }: AnalyticsHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = 'hsl(0, 0%, 7%)'
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'hsl(0, 0%, 14%)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * w
      const y = (i / 10) * h
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    if (data.length === 0) {
      ctx.fillStyle = 'hsl(0, 0%, 40%)'
      ctx.font = '13px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('No heatmap data', w / 2, h / 2)
      return
    }

    // Render heatmap dots with radial gradients
    for (const point of data) {
      const cx = point.x * w
      const cy = point.y * h
      const radius = 20 + point.intensity * 40

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      const alpha = 0.15 + point.intensity * 0.5

      // Color by intensity: low=blue, medium=yellow, high=red
      if (point.intensity > 0.7) {
        gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha})`)
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)')
      } else if (point.intensity > 0.4) {
        gradient.addColorStop(0, `rgba(234, 179, 8, ${alpha})`)
        gradient.addColorStop(1, 'rgba(234, 179, 8, 0)')
      } else {
        gradient.addColorStop(0, `rgba(59, 130, 246, ${alpha})`)
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()

      // Center dot
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + point.intensity * 0.5})`
      ctx.beginPath()
      ctx.arc(cx, cy, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Page labels
    const pages = [...new Set(data.map((d) => d.pageNumber))].sort((a, b) => a - b)
    ctx.fillStyle = 'hsl(0, 0%, 60%)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`Pages: ${pages.join(', ')}`, 6, h - 6)
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md border border-border"
      style={{ height: 240 }}
    />
  )
}
