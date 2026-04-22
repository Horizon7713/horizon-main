"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type IdleCallbackDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleCallbackDeadline) => void;

type IdleCallbackOptions = {
  timeout?: number;
};

type PdfJsLib = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (src: {
    url?: string;
    disableAutoFetch?: boolean;
    disableStream?: boolean;
    disableRange?: boolean;
    rangeChunkSize?: number;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    stopAtErrors?: boolean;
    cMapPacked?: boolean;
  }) => PdfLoadingTask;
};


declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

type PdfViewport = {
  width: number;
  height: number;
};

type PdfPageProxy = {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => {
    promise: Promise<unknown>;
    cancel?: () => void;
  };
  cleanup?: () => void;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy?: () => Promise<void> | void;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocumentProxy>;
  destroy?: () => void;
};

const PDFJS_VERSION = "2.16.105";
const PDFJS_SCRIPT_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const RANGE_CHUNK_SIZE = 1 << 18;
const THUMBNAIL_SCALE = 0.18;
const THUMBNAIL_QUALITY = 0.72;
const OVERSCAN = 5;
const ROW_HEIGHT = 168;
const PREFETCH_RADIUS = 2;
const PAGE_CACHE_LIMIT = 12;

function loadPdfJsBrowserLib(): Promise<PdfJsLib> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("PDF.js can only load in the browser."));
      return;
    }

    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      resolve(window.pdfjsLib);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-pdfjs-browser="true"]'
    );

    if (existing) {
      const handleLoad = () => {
        if (!window.pdfjsLib) {
          reject(new Error("PDF.js loaded but window.pdfjsLib is missing."));
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        resolve(window.pdfjsLib);
      };

      existing.addEventListener("load", handleLoad, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load PDF.js browser script.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_SCRIPT_SRC;
    script.async = true;
    script.dataset.pdfjsBrowser = "true";

    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("PDF.js loaded but window.pdfjsLib is missing."));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      resolve(window.pdfjsLib);
    };

    script.onerror = () => {
      reject(new Error("Failed to load PDF.js browser script."));
    };

    document.head.appendChild(script);
  });
}

interface PageThumbnailTrayProps {
  isOpen?: boolean;
  pdfUrl?: string;
  totalPages: number;
  currentPageIndex: number;
  onPageSelect: (pageIndex: number) => void;
  onPageCountDetected?: (pageCount: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function PageThumbnailTray({
  isOpen = true,
  pdfUrl,
  totalPages,
  currentPageIndex,
  onPageSelect,
  onPageCountDetected,
}: PageThumbnailTrayProps) {
  const [resolvedPageCount, setResolvedPageCount] = useState(
    Math.max(totalPages, 0)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [version, setVersion] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);
  const lastPdfUrlRef = useRef<string | undefined>(undefined);
  const loadingTaskRef = useRef<PdfLoadingTask | null>(null);
  const idleHandleRef = useRef<number | null>(null);

  const pageCacheRef = useRef<Map<number, PdfPageProxy>>(new Map());
  const pageRequestCacheRef = useRef<Map<number, Promise<PdfPageProxy | null>>>(
    new Map()
  );
  const thumbCacheRef = useRef<Map<number, string>>(new Map());
  const thumbRequestCacheRef = useRef<Map<number, Promise<string | null>>>(
    new Map()
  );

  const pageCount = Math.max(resolvedPageCount, totalPages, 0);

  const bumpVersion = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  const clearIdleCallback = useCallback(() => {
    if (idleHandleRef.current == null) return;

    if (typeof window !== "undefined" && window.cancelIdleCallback) {
      window.cancelIdleCallback(idleHandleRef.current);
    } else {
      window.clearTimeout(idleHandleRef.current);
    }

    idleHandleRef.current = null;
  }, []);

  const resetCaches = useCallback(() => {
    pageCacheRef.current.forEach((page) => {
      try {
        page.cleanup?.();
      } catch {}
    });

    pageCacheRef.current.clear();
    pageRequestCacheRef.current.clear();
    thumbCacheRef.current.clear();
    thumbRequestCacheRef.current.clear();
    bumpVersion();
  }, [bumpVersion]);

  const destroyPdfDoc = useCallback(async () => {
    const doc = pdfDocRef.current;
    pdfDocRef.current = null;

    try {
      loadingTaskRef.current?.destroy?.();
    } catch {}
    loadingTaskRef.current = null;

    resetCaches();

    try {
      await doc?.destroy?.();
    } catch {}
  }, [resetCaches]);

  const trimPageCache = useCallback((centerPageNumber: number) => {
    const pageNumbers = [...pageCacheRef.current.keys()];
    if (pageNumbers.length <= PAGE_CACHE_LIMIT) return;

    const keep = new Set(
      pageNumbers
        .sort(
          (a, b) =>
            Math.abs(a - centerPageNumber) - Math.abs(b - centerPageNumber)
        )
        .slice(0, PAGE_CACHE_LIMIT)
    );

    pageNumbers.forEach((pageNumber) => {
      if (keep.has(pageNumber)) return;
      const page = pageCacheRef.current.get(pageNumber);
      try {
        page?.cleanup?.();
      } catch {}
      pageCacheRef.current.delete(pageNumber);
      pageRequestCacheRef.current.delete(pageNumber);
    });
  }, []);

  const getCachedPage = useCallback(
    async (pageNumber: number, docOverride?: PdfDocumentProxy | null) => {
      const cached = pageCacheRef.current.get(pageNumber);
      if (cached) return cached;

      const pending = pageRequestCacheRef.current.get(pageNumber);
      if (pending) return pending;

      const doc = docOverride ?? pdfDocRef.current;
      if (!doc) return null;

      const request = doc
        .getPage(pageNumber)
        .then((page) => {
          pageCacheRef.current.set(pageNumber, page);
          pageRequestCacheRef.current.delete(pageNumber);
          trimPageCache(pageNumber);
          return page;
        })
        .catch((error) => {
          pageRequestCacheRef.current.delete(pageNumber);
          throw error;
        });

      pageRequestCacheRef.current.set(pageNumber, request);
      return request;
    },
    [trimPageCache]
  );

  const renderThumbnailSrc = useCallback(
    async (pageNumber: number, docOverride?: PdfDocumentProxy | null) => {
      const cached = thumbCacheRef.current.get(pageNumber);
      if (cached) return cached;

      const pending = thumbRequestCacheRef.current.get(pageNumber);
      if (pending) return pending;

      const request = (async () => {
        const page = await getCachedPage(pageNumber, docOverride);
        if (!page) return null;

        const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return null;

        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const src = canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY);
        thumbCacheRef.current.set(pageNumber, src);
        bumpVersion();
        return src;
      })()
        .catch((error: unknown) => {
          const maybeError = error as { name?: string };
          if (maybeError?.name !== "RenderingCancelledException") {
            console.error(`Failed to render thumbnail for page ${pageNumber}:`, error);
          }
          return null;
        })
        .finally(() => {
          thumbRequestCacheRef.current.delete(pageNumber);
        });

      thumbRequestCacheRef.current.set(pageNumber, request);
      return request;
    },
    [bumpVersion, getCachedPage]
  );

  useEffect(() => {
    if (!isOpen || !pdfUrl) {
      setResolvedPageCount(Math.max(totalPages, 0));
      setLoadError(null);
      lastPdfUrlRef.current = undefined;
      void destroyPdfDoc();
      return;
    }

    if (lastPdfUrlRef.current === pdfUrl && pdfDocRef.current) {
      return;
    }

    let cancelled = false;
    lastPdfUrlRef.current = pdfUrl;

    async function loadPdf() {
      try {
        setIsLoading(true);
        setLoadError(null);
        clearIdleCallback();
        await destroyPdfDoc();

        const pdfjsLib = await loadPdfJsBrowserLib();
       const safePdfUrl = pdfUrl;
if (!safePdfUrl) return;

const proxiedPdfUrl = `/api/pdf/proxy?url=${encodeURIComponent(safePdfUrl)}`;

        const loadingTask = pdfjsLib.getDocument({
          url: proxiedPdfUrl,
          disableAutoFetch: false,
          disableStream: false,
          disableRange: false,
          rangeChunkSize: RANGE_CHUNK_SIZE,
          useWorkerFetch: true,
          isEvalSupported: true,
          stopAtErrors: false,
          cMapPacked: true,
        });

        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) {
          try {
            await doc.destroy?.();
          } catch {}
          return;
        }

        pdfDocRef.current = doc;
        setResolvedPageCount(doc.numPages);
        onPageCountDetected?.(doc.numPages);

        const priorityPages = new Set<number>();
        const currentPageNumber = currentPageIndex + 1;
        priorityPages.add(currentPageNumber);
        for (let i = 1; i <= PREFETCH_RADIUS; i += 1) {
          priorityPages.add(currentPageNumber - i);
          priorityPages.add(currentPageNumber + i);
        }

        await Promise.all(
          [...priorityPages]
            .filter((pageNumber) => pageNumber >= 1 && pageNumber <= doc.numPages)
            .map((pageNumber) => renderThumbnailSrc(pageNumber, doc))
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load thumbnails:", error);
          setLoadError(
            error instanceof Error ? error.message : "Failed to load thumbnails."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
    };
  }, [
    clearIdleCallback,
    currentPageIndex,
    destroyPdfDoc,
    isOpen,
    onPageCountDetected,
    pdfUrl,
    renderThumbnailSrc,
    totalPages,
  ]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateSize = () => {
      setViewportHeight(container.clientHeight);
      setScrollTop(container.scrollTop);
    };

    updateSize();
    container.addEventListener("scroll", updateSize, { passive: true });
    window.addEventListener("resize", updateSize);

    return () => {
      container.removeEventListener("scroll", updateSize);
      window.removeEventListener("resize", updateSize);
    };
  }, [isOpen, pageCount]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || pageCount <= 0) return;

    const targetTop = clamp(currentPageIndex * ROW_HEIGHT - ROW_HEIGHT * 2, 0, Math.max(0, pageCount * ROW_HEIGHT - container.clientHeight));
    container.scrollTo({ top: targetTop, behavior: "smooth" });
  }, [currentPageIndex, pageCount]);

  const visibleRange = useMemo(() => {
    if (pageCount <= 0) {
      return { start: 0, end: -1 };
    }

    const visibleStart = Math.floor(scrollTop / ROW_HEIGHT);
    const visibleEnd = Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) - 1;

    return {
      start: clamp(visibleStart - OVERSCAN, 0, Math.max(pageCount - 1, 0)),
      end: clamp(visibleEnd + OVERSCAN, 0, Math.max(pageCount - 1, 0)),
    };
  }, [pageCount, scrollTop, viewportHeight]);

  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || pageCount <= 0) return;

    const pagesToWarm = new Set<number>();

    for (let index = visibleRange.start; index <= visibleRange.end; index += 1) {
      pagesToWarm.add(index + 1);
    }

    const currentPageNumber = currentPageIndex + 1;
    pagesToWarm.add(currentPageNumber);
    for (let i = 1; i <= PREFETCH_RADIUS; i += 1) {
      pagesToWarm.add(currentPageNumber - i);
      pagesToWarm.add(currentPageNumber + i);
    }

    const run = () => {
      [...pagesToWarm]
        .filter((pageNumber) => pageNumber >= 1 && pageNumber <= pageCount)
        .forEach((pageNumber) => {
          void renderThumbnailSrc(pageNumber, doc);
        });
    };

    clearIdleCallback();

    if (typeof window !== "undefined" && window.requestIdleCallback) {
      idleHandleRef.current = window.requestIdleCallback(() => run(), {
        timeout: 400,
      });
    } else {
      idleHandleRef.current = window.setTimeout(run, 80);
    }

    return () => {
      clearIdleCallback();
    };
  }, [
    clearIdleCallback,
    currentPageIndex,
    pageCount,
    renderThumbnailSrc,
    version,
    visibleRange.end,
    visibleRange.start,
  ]);

  useEffect(() => {
    return () => {
      clearIdleCallback();
      void destroyPdfDoc();
    };
  }, [clearIdleCallback, destroyPdfDoc]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <div className="shrink-0 border-b border-zinc-800 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Pages
        </div>
        <div className="mt-1 text-sm font-semibold text-white">
          {pageCount > 0 ? `${pageCount} pages` : "No pages"}
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {isLoading ? "Loading thumbnails…" : "Lazy loaded thumbnails"}
        </div>
      </div>

      {loadError ? (
        <div className="shrink-0 border-b border-red-900/50 bg-red-950/40 px-4 py-3 text-xs text-red-200">
          {loadError}
        </div>
      ) : null}

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="relative"
          style={{ height: Math.max(pageCount * ROW_HEIGHT, 0) }}
        >
          {Array.from(
            { length: Math.max(visibleRange.end - visibleRange.start + 1, 0) },
            (_, offset) => visibleRange.start + offset
          ).map((pageIndex) => {
            const pageNumber = pageIndex + 1;
            const thumbnailSrc = thumbCacheRef.current.get(pageNumber);
            const isActive = pageIndex === currentPageIndex;

            return (
              <div
                key={pageNumber}
                className="absolute left-0 w-full px-3 py-2"
                style={{ top: pageIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <button
                  type="button"
                  onClick={() => onPageSelect(pageIndex)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-all",
                    isActive
                      ? "border-amber-500/50 bg-zinc-900 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex h-[132px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-white shadow-inner">
                    {thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={`Page ${pageNumber}`}
                        className="block max-h-full max-w-full object-contain"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-[10px] font-medium text-zinc-400">
                        {isLoading && pageNumber === currentPageIndex + 1
                          ? "Loading"
                          : `P${pageNumber}`}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-xs font-semibold",
                        isActive ? "text-amber-300" : "text-zinc-200"
                      )}
                    >
                      Page {pageNumber}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">
                      {thumbnailSrc ? "Ready" : "Queued"}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
