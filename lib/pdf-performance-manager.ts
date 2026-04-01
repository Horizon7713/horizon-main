'use client'

/**
 * PDF Performance Optimization
 * Handles efficient rendering for large multi-page PDFs
 * - Page caching
 * - Lazy loading
 * - Worker thread rendering
 * - Memory management
 */

export interface CachedPage {
  pageNumber: number
  canvas: HTMLCanvasElement
  timestamp: number
}

export class PDFPerformanceManager {
  private pageCache: Map<number, CachedPage> = new Map()
  private maxCacheSize: number = 10 // Cache 10 pages max
  private renderingQueue: Set<number> = new Set()
  private visibleRange: { start: number; end: number } = { start: 0, end: 0 }

  /**
   * Get cached page or null if not cached
   */
  getPageFromCache(pageNumber: number): HTMLCanvasElement | null {
    const cached = this.pageCache.get(pageNumber)
    if (cached) {
      cached.timestamp = Date.now() // Update access time
      return cached.canvas
    }
    return null
  }

  /**
   * Add page to cache
   */
  cachePageCanvas(pageNumber: number, canvas: HTMLCanvasElement) {
    // Remove oldest entries if cache is full
    if (this.pageCache.size >= this.maxCacheSize) {
      let oldestPage = -1
      let oldestTime = Infinity

      for (const [pageNum, cached] of this.pageCache.entries()) {
        if (cached.timestamp < oldestTime) {
          oldestTime = cached.timestamp
          oldestPage = pageNum
        }
      }

      if (oldestPage !== -1) {
        this.pageCache.delete(oldestPage)
      }
    }

    this.pageCache.set(pageNumber, {
      pageNumber,
      canvas,
      timestamp: Date.now(),
    })
  }

  /**
   * Calculate which pages are visible and should be prioritized for rendering
   */
  updateVisibleRange(currentPage: number, zoom: number, viewport: HTMLElement) {
    // Show current page + one page on each side for scrolling
    const preloadBuffer = 1
    this.visibleRange = {
      start: Math.max(1, currentPage - preloadBuffer),
      end: currentPage + preloadBuffer,
    }
  }

  /**
   * Check if page should be preloaded based on visibility
   */
  shouldPreloadPage(pageNumber: number): boolean {
    return pageNumber >= this.visibleRange.start && pageNumber <= this.visibleRange.end
  }

  /**
   * Get pages that need rendering in priority order
   */
  getPriorityRenderQueue(totalPages: number): number[] {
    const queue: number[] = []

    // Add visible pages first (highest priority)
    for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
      if (i > 0 && i <= totalPages && !this.pageCache.has(i)) {
        queue.push(i)
      }
    }

    // Add nearby pages (medium priority)
    const nearbyBuffer = 2
    for (let i = Math.max(1, this.visibleRange.start - nearbyBuffer); i <= Math.min(totalPages, this.visibleRange.end + nearbyBuffer); i++) {
      if (!queue.includes(i) && !this.pageCache.has(i)) {
        queue.push(i)
      }
    }

    return queue
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    this.pageCache.clear()
    this.renderingQueue.clear()
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      cachedPages: this.pageCache.size,
      maxCacheSize: this.maxCacheSize,
      utilizationPercent: (this.pageCache.size / this.maxCacheSize) * 100,
      visibleRange: this.visibleRange,
    }
  }

  /**
   * Optimize canvas rendering for performance
   */
  optimizeCanvasContext(ctx: CanvasRenderingContext2D) {
    // Disable image smoothing for pixelated rendering (faster)
    ctx.imageSmoothingEnabled = false
    // Use appropriate quality
    ctx.imageSmoothingQuality = 'low'
  }

  /**
   * Debounce function for viewport changes
   */
  debounceViewportUpdate(callback: () => void, delay: number = 200): (...args: any[]) => void {
    let timeoutId: NodeJS.Timeout

    return function debounced(...args: any[]) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        callback()
      }, delay)
    }
  }

  /**
   * Throttle function for frequent events
   */
  throttleRender(callback: () => void, limit: number = 16): (...args: any[]) => void {
    let inThrottle: boolean

    return function throttled(...args: any[]) {
      if (!inThrottle) {
        callback()
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}

/**
 * Virtualization helper for rendering only visible markups
 */
export class MarkupVirtualizer {
  /**
   * Filter markups to only show those on current page
   */
  filterMarkupsByPage(markups: any[], currentPage: number): any[] {
    return markups.filter((m) => m.pageNumber === currentPage)
  }

  /**
   * Filter markups by viewport bounds (for canvas optimization)
   */
  filterMarkupsByViewport(markups: any[], viewportBounds: DOMRect, zoom: number): any[] {
    return markups.filter((markup) => {
      const bounds = this.getMarkupBounds(markup)
      return this.boundsIntersect(bounds, viewportBounds)
    })
  }

  /**
   * Get bounding box of a markup
   */
  private getMarkupBounds(markup: any): { x: number; y: number; width: number; height: number } {
    switch (markup.type) {
      case 'line':
      case 'distance':
        const minX = Math.min(markup.startPoint.x, markup.endPoint.x)
        const minY = Math.min(markup.startPoint.y, markup.endPoint.y)
        const maxX = Math.max(markup.startPoint.x, markup.endPoint.x)
        const maxY = Math.max(markup.startPoint.y, markup.endPoint.y)
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

      case 'rectangle':
        return {
          x: markup.x,
          y: markup.y,
          width: markup.width,
          height: markup.height,
        }

      case 'ellipse':
        return {
          x: markup.cx - markup.rx,
          y: markup.cy - markup.ry,
          width: markup.rx * 2,
          height: markup.ry * 2,
        }

      default:
        return { x: 0, y: 0, width: 0, height: 0 }
    }
  }

  /**
   * Check if two bounds intersect
   */
  private boundsIntersect(
    bounds1: { x: number; y: number; width: number; height: number },
    bounds2: DOMRect
  ): boolean {
    return (
      bounds1.x < bounds2.right &&
      bounds1.x + bounds1.width > bounds2.left &&
      bounds1.y < bounds2.bottom &&
      bounds1.y + bounds1.height > bounds2.top
    )
  }
}

export const performanceManager = new PDFPerformanceManager()
export const markupVirtualizer = new MarkupVirtualizer()
