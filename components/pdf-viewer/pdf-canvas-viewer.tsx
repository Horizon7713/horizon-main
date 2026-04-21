"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePdfViewer } from "@/lib/pdf-viewer-context";
import { getMarkupsForPage, getMarkupById } from "@/lib/pdf-markup-store";
import { MarkupOverlay } from "./internal/markup-overlay";
import { SelectionOverlay } from "./internal/selection-overlay";
import { ViewportControls } from "./internal/viewport-controls";
import type {
  CountMarkup,
  LineMarkup,
  PlanRegion,
  Point,
  RectangleMarkup,
} from "@/lib/pdf-viewer-types";

interface PdfCanvasViewerProps {
  className?: string;
}

type PdfViewport = {
  width: number;
  height: number;
};

type PdfRenderTask = {
  promise: Promise<unknown>;
  cancel?: () => void;
};

type PdfPageProxy = {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => PdfRenderTask;
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

type PdfJsLib = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (src: {
    url?: string;
    data?: Uint8Array;
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

const ZONE_SNAP_DISTANCE = 16;
const PDFJS_VERSION = "2.16.105";
const PDFJS_SCRIPT_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const DEFAULT_PAGE_SIZE = { width: 1000, height: 1400 };
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 12;
const FIT_PADDING_X = 48;
const FIT_PADDING_Y = 48;
const DOUBLE_CLICK_ZOOM_FACTOR = 1.5;
const RASTER_RERENDER_DELAY_MS = 140;
const WHEEL_ZOOM_IDLE_MS = 220;
const PREFETCH_SETTLE_MS = 180;
const PAGE_CACHE_LIMIT = 6;
const RANGE_CHUNK_SIZE = 1 << 18;

const WHEEL_ZOOM_SENSITIVITY = 0.00135;
const WHEEL_LINE_HEIGHT = 16;
const WHEEL_PAGE_HEIGHT = 800;
const SHIFT_WHEEL_PAN_MULTIPLIER = 1.15;

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWheelDelta(event: React.WheelEvent) {
  let delta = event.deltaY;

  if (event.deltaMode === 1) {
    delta *= WHEEL_LINE_HEIGHT;
  } else if (event.deltaMode === 2) {
    delta *= WHEEL_PAGE_HEIGHT;
  }

  return delta;
}

function getAdaptiveZoomSensitivity(zoom: number) {
  if (zoom >= 6) return 0.00055;
  if (zoom >= 4) return 0.00075;
  if (zoom >= 2.5) return 0.00095;
  if (zoom >= 1.5) return 0.00115;
  return WHEEL_ZOOM_SENSITIVITY;
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getBoundsFromPoints(points: Point[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function getPolygonArea(points: Point[]) {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

function formatMeasuredValue(value: number, precision: number) {
  return Number(value.toFixed(precision));
}

function getTargetRenderScale(zoom: number) {
  if (zoom < 1.25) return 1;
  if (zoom < 2) return 1.5;
  if (zoom < 3) return 2;
  if (zoom < 5) return 2.5;
  return 3;
}

function getDevicePixelScale(isInitialPaint: boolean) {
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  return isInitialPaint ? 1 : Math.min(dpr, 1.5);
}

export function PdfCanvasViewer({ className }: PdfCanvasViewerProps) {
  const {
    state,
    setZoom,
    setPan,
    setPageCount,
    setCurrentPage,
    setCalibration,
    openCalibrationDialog,
    selectMarkup,
    addMarkup,
    clearSelection,
    deleteMarkup,
    addRegion,
    selectRegion,
  } = usePdfViewer();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);
  const hasAutoFittedRef = useRef(false);
  const pageCacheRef = useRef<Map<number, PdfPageProxy>>(new Map());
  const pageSizeCacheRef = useRef<Map<number, PdfViewport>>(new Map());
  const pageRequestCacheRef = useRef<Map<number, Promise<PdfPageProxy | null>>>(new Map());
  const initialPaintDoneRef = useRef(false);
  const prefetchTimeoutRef = useRef<number | null>(null);
  const wheelZoomIdleTimeoutRef = useRef<number | null>(null);
  const suppressZoomRasterRef = useRef(false);
  const hasUserZoomedRef = useRef(false);
  

  const dragPanRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [renderScale, setRenderScale] = useState(1);

  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [draftCurrent, setDraftCurrent] = useState<Point | null>(null);
  const [zonePoints, setZonePoints] = useState<Point[]>([]);
  const [zoneHoverPoint, setZoneHoverPoint] = useState<Point | null>(null);

  const currentPageMarkups = useMemo(
    () => getMarkupsForPage(state.markups, state.document.currentPageIndex),
    [state.markups, state.document.currentPageIndex]
  );

  const currentPageRegions = useMemo(
    () =>
      state.regions.filter(
        (region) => region.pageIndex === state.document.currentPageIndex
      ),
    [state.regions, state.document.currentPageIndex]
  );

  const selectedMarkup = useMemo(
    () => getMarkupById(state.markups, state.selection.selectedMarkupIds[0]),
    [state.markups, state.selection.selectedMarkupIds]
  );

  const selectedRegion = useMemo(
    () => state.regions.find((r) => r.id === state.selection.selectedRegionId),
    [state.regions, state.selection.selectedRegionId]
  );

  const isItemBoxTool = state.ui.activeTool === "rectangle";
  const isScopeZoneTool = state.ui.activeTool === "region-rectangle";
  const isScaleTool = state.ui.activeTool === "calibrate";
  const isLengthTool = state.ui.activeTool === "measure-length";
  const isAreaTool = state.ui.activeTool === "measure-area";
  const isCountTool = state.ui.activeTool === "measure-count";

  const panX = state.viewport.panX;
  const panY = state.viewport.panY;
  const zoom = state.viewport.zoom;
  const isHandPanning = isMiddlePanning || isSpacePanning;

  const trimPageCache = useCallback((centerPageNumber: number) => {
    const pageNumbers = [...pageCacheRef.current.keys()];
    if (pageNumbers.length <= PAGE_CACHE_LIMIT) return;

    const sortedByDistance = pageNumbers
      .map((pageNumber) => ({
        pageNumber,
        distance: Math.abs(pageNumber - centerPageNumber),
      }))
      .sort((a, b) => a.distance - b.distance);

    const keep = new Set(
      sortedByDistance.slice(0, PAGE_CACHE_LIMIT).map((entry) => entry.pageNumber)
    );

    pageNumbers.forEach((pageNumber) => {
      if (keep.has(pageNumber)) return;
      const page = pageCacheRef.current.get(pageNumber);
      try {
        page?.cleanup?.();
      } catch {}
      pageCacheRef.current.delete(pageNumber);
      pageSizeCacheRef.current.delete(pageNumber);
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
          pageSizeCacheRef.current.set(pageNumber, page.getViewport({ scale: 1 }));
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

  const getCachedBaseViewport = useCallback(
    async (pageNumber: number, docOverride?: PdfDocumentProxy | null) => {
      const cached = pageSizeCacheRef.current.get(pageNumber);
      if (cached) return cached;
      const page = await getCachedPage(pageNumber, docOverride);
      if (!page) return null;
      const viewport = page.getViewport({ scale: 1 });
      pageSizeCacheRef.current.set(pageNumber, viewport);
      return viewport;
    },
    [getCachedPage]
  );

  const cancelActiveRender = useCallback(() => {
    try {
      renderTaskRef.current?.cancel?.();
    } catch {}
    renderTaskRef.current = null;
  }, []);

  const resetPageCaches = useCallback(() => {
    pageCacheRef.current.forEach((page) => {
      try {
        page.cleanup?.();
      } catch {}
    });
    pageCacheRef.current.clear();
    pageSizeCacheRef.current.clear();
    pageRequestCacheRef.current.clear();
  }, []);

  const destroyCurrentPdfDoc = useCallback(async () => {
    const currentDoc = pdfDocRef.current;
    pdfDocRef.current = null;
    resetPageCaches();

    if (!currentDoc?.destroy) return;

    try {
      await currentDoc.destroy();
    } catch {}
  }, [resetPageCaches]);

  const setZoomAtClientPoint = useCallback(
    (clientX: number, clientY: number, nextZoom: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(clampedZoom - zoom) < 0.0001) return;

      const viewportRect = viewport.getBoundingClientRect();
      const localX = clientX - viewportRect.left;
      const localY = clientY - viewportRect.top;

      const worldX = (localX - panX) / zoom;
      const worldY = (localY - panY) / zoom;

      const nextPanX = localX - worldX * clampedZoom;
      const nextPanY = localY - worldY * clampedZoom;

      hasUserZoomedRef.current = true;
      setPan(nextPanX, nextPanY);
      setZoom(clampedZoom);
    },
    [panX, panY, setPan, setZoom, zoom]
  );

  const fitToPage = useCallback(async () => {
    const viewport = viewportRef.current;
    if (!pdfDocRef.current || !viewport) return;

    try {
      const pageNumber = state.document.currentPageIndex + 1;
      const baseViewport = await getCachedBaseViewport(pageNumber);
      if (!baseViewport) return;

      const availableWidth = Math.max(viewport.clientWidth - FIT_PADDING_X, 100);
      const availableHeight = Math.max(viewport.clientHeight - FIT_PADDING_Y, 100);

      const nextZoom = clamp(
        Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height
        ),
        MIN_ZOOM,
        MAX_ZOOM
      );

      const nextPanX = (viewport.clientWidth - baseViewport.width * nextZoom) / 2;
      const nextPanY = (viewport.clientHeight - baseViewport.height * nextZoom) / 2;

      suppressZoomRasterRef.current = false;
      hasUserZoomedRef.current = false;
      setZoom(nextZoom);
      setPan(nextPanX, nextPanY);
    } catch (error) {
      console.error("Failed to fit page:", error);
    }
  }, [getCachedBaseViewport, setPan, setZoom, state.document.currentPageIndex]);

  const fitToWidth = useCallback(async () => {
    const viewport = viewportRef.current;
    if (!pdfDocRef.current || !viewport) return;

    try {
      const pageNumber = state.document.currentPageIndex + 1;
      const baseViewport = await getCachedBaseViewport(pageNumber);
      if (!baseViewport) return;

      const availableWidth = Math.max(viewport.clientWidth - FIT_PADDING_X, 100);
      const nextZoom = clamp(availableWidth / baseViewport.width, MIN_ZOOM, MAX_ZOOM);

      const nextPanX = (viewport.clientWidth - baseViewport.width * nextZoom) / 2;
      const nextPanY = 24;
      
      hasUserZoomedRef.current = false;
      suppressZoomRasterRef.current = false;
      setZoom(nextZoom);
      setPan(nextPanX, nextPanY);
    } catch (error) {
      console.error("Failed to fit width:", error);
    }
  }, [getCachedBaseViewport, setPan, setZoom, state.document.currentPageIndex]);

  const getPagePoint = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): Point | null => {
      const pageEl = pageRef.current;
      if (!pageEl) return null;

      const rect = pageEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const x = ((event.clientX - rect.left) / rect.width) * pageSize.width;
      const y = ((event.clientY - rect.top) / rect.height) * pageSize.height;

      return {
        x: clamp(x, 0, pageSize.width),
        y: clamp(y, 0, pageSize.height),
      };
    },
    [pageSize.height, pageSize.width]
  );

  const getRealLengthFromPixels = useCallback(
    (pixelDistance: number) => {
      if (!state.calibration.isCalibrated || !state.calibration.scaleRatio) return null;
      return pixelDistance * state.calibration.scaleRatio;
    },
    [state.calibration]
  );

  const getRealAreaFromPixelArea = useCallback(
    (pixelArea: number) => {
      if (!state.calibration.isCalibrated || !state.calibration.scaleRatio) return null;
      return pixelArea * state.calibration.scaleRatio * state.calibration.scaleRatio;
    },
    [state.calibration]
  );

  const handleWheelZoom = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!pdfDocRef.current) return;

      event.preventDefault();

      const normalizedDelta = normalizeWheelDelta(event);

      if (event.shiftKey) {
        setPan(panX - normalizedDelta * SHIFT_WHEEL_PAN_MULTIPLIER, panY);
        return;
      }

      if (isHandPanning) return;

      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      const worldX = (localX - panX) / zoom;
      const worldY = (localY - panY) / zoom;

      const sensitivity = getAdaptiveZoomSensitivity(zoom);
      const zoomFactor = Math.exp(-normalizedDelta * sensitivity);
      const nextZoom = clamp(zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

      if (Math.abs(nextZoom - zoom) < 0.0001) return;

      const nextPanX = localX - worldX * nextZoom;
      const nextPanY = localY - worldY * nextZoom;
      
      hasUserZoomedRef.current = true;
      suppressZoomRasterRef.current = true;
      if (wheelZoomIdleTimeoutRef.current != null) {
        window.clearTimeout(wheelZoomIdleTimeoutRef.current);
      }

      wheelZoomIdleTimeoutRef.current = window.setTimeout(() => {
        suppressZoomRasterRef.current = false;
        const targetScale = getTargetRenderScale(nextZoom);
        setRenderScale((prev) => (prev === targetScale ? prev : targetScale));
      }, WHEEL_ZOOM_IDLE_MS);

      setPan(nextPanX, nextPanY);
      setZoom(nextZoom);
    },
    [isHandPanning, panX, panY, setPan, setZoom, zoom]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!pdfDocRef.current) return;
      event.preventDefault();
      hasUserZoomedRef.current = true;
      suppressZoomRasterRef.current = false;
      setZoomAtClientPoint(
        event.clientX,
        event.clientY,
        Math.min(zoom * DOUBLE_CLICK_ZOOM_FACTOR, MAX_ZOOM)
      );
    },
    [setZoomAtClientPoint, zoom]
  );

  const startHandPan = useCallback(
    (clientX: number, clientY: number, source: "middle" | "space") => {
      dragPanRef.current = {
        startClientX: clientX,
        startClientY: clientY,
        startPanX: panX,
        startPanY: panY,
      };

      if (source === "middle") setIsMiddlePanning(true);
      if (source === "space") setIsSpacePanning(true);
    },
    [panX, panY]
  );

  const beginMiddlePan = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 1) return;

      event.preventDefault();
      event.stopPropagation();
      startHandPan(event.clientX, event.clientY, "middle");
    },
    [startHandPan]
  );

  const handleAuxClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 1) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        tagName === "input" || tagName === "textarea" || target?.isContentEditable;

      if (!isEditable && event.code === "Space") {
        event.preventDefault();
        setIsSpacePressed(true);
      }

      if ((isScopeZoneTool || isScaleTool || isLengthTool) && event.key === "Escape") {
        setZonePoints([]);
        setZoneHoverPoint(null);
        setDraftStart(null);
        setDraftCurrent(null);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        void fitToPage();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "1") {
        event.preventDefault();
        suppressZoomRasterRef.current = false;
        setZoom(1);
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const selectedId = state.selection.selectedMarkupIds[0];
      if (!selectedId || isEditable) return;

      deleteMarkup(selectedId);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setIsSpacePressed(false);
        setIsSpacePanning(false);
        dragPanRef.current = null;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    deleteMarkup,
    fitToPage,
    isLengthTool,
    isScaleTool,
    isScopeZoneTool,
    setZoom,
    state.selection.selectedMarkupIds,
  ]);

  useEffect(() => {
    if (!isHandPanning) return;

    function handleMouseMove(event: MouseEvent) {
      const pan = dragPanRef.current;
      if (!pan) return;

      const dx = event.clientX - pan.startClientX;
      const dy = event.clientY - pan.startClientY;

      setPan(pan.startPanX + dx, pan.startPanY + dy);
    }

    function endPan() {
      dragPanRef.current = null;
      setIsMiddlePanning(false);
      setIsSpacePanning(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", endPan);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", endPan);
    };
  }, [isHandPanning, setPan]);

  useEffect(() => {
    if (suppressZoomRasterRef.current) return;

    const targetScale = getTargetRenderScale(zoom);
    const timeout = window.setTimeout(() => {
      setRenderScale((prev) => (prev === targetScale ? prev : targetScale));
    }, RASTER_RERENDER_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [zoom]);

  useEffect(() => {
    return () => {
      if (wheelZoomIdleTimeoutRef.current != null) {
        window.clearTimeout(wheelZoomIdleTimeoutRef.current);
        wheelZoomIdleTimeoutRef.current = null;
      }
      if (prefetchTimeoutRef.current != null) {
        window.clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfLoadingTask | null = null;

    async function loadPdf() {
      cancelActiveRender();
      await destroyCurrentPdfDoc();
      hasAutoFittedRef.current = false;
      initialPaintDoneRef.current = false;
      hasUserZoomedRef.current = false;

      if (!state.document.pdfUrl) {
        if (!cancelled) {
          setPdfDoc(null);
          setViewerError(null);
          setPageSize(DEFAULT_PAGE_SIZE);
          setPageCount(0);
          setPan(0, 0);
        }
        return;
      }

      try {
        setViewerError(null);
        setPdfDoc(null);

        const pdfjsLib = await loadPdfJsBrowserLib();
        const proxiedPdfUrl = `/api/pdf/proxy?url=${encodeURIComponent(
          state.document.pdfUrl
        )}`;

        loadingTask = pdfjsLib.getDocument({
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

        const doc = await loadingTask.promise;

        if (cancelled) {
          try {
            await doc.destroy?.();
          } catch {}
          return;
        }

        pdfDocRef.current = doc;
        setPdfDoc(doc);
        setPageCount(doc.numPages);

        const safePageIndex = Math.min(
          state.document.currentPageIndex,
          Math.max(doc.numPages - 1, 0)
        );

        if (safePageIndex !== state.document.currentPageIndex) {
          setCurrentPage(safePageIndex);
        }

        const firstVisiblePageNumber = safePageIndex + 1;
        const firstViewport = await getCachedBaseViewport(firstVisiblePageNumber, doc);

        if (!cancelled && firstViewport) {
          setPageSize({
            width: firstViewport.width,
            height: firstViewport.height,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load PDF:", error);
        setViewerError(
          error instanceof Error ? error.message : "Failed to load PDF."
        );
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch {}
    };
  }, [
    cancelActiveRender,
    destroyCurrentPdfDoc,
    getCachedBaseViewport,
    setCurrentPage,
    setPageCount,
    setPan,
    state.document.currentPageIndex,
    state.document.pdfUrl,
  ]);

  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;

    async function syncBasePageSize() {
      try {
        const pageNumber = state.document.currentPageIndex + 1;
        const baseViewport = await getCachedBaseViewport(pageNumber, pdfDoc);

        if (!cancelled && baseViewport) {
          setPageSize({
            width: baseViewport.width,
            height: baseViewport.height,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to get page size:", error);
        }
      }
    }

    void syncBasePageSize();

    return () => {
      cancelled = true;
    };
  }, [getCachedBaseViewport, pdfDoc, state.document.currentPageIndex]);

  useEffect(() => {
    if (!pdfDoc || hasAutoFittedRef.current || hasUserZoomedRef.current) return;

    const viewport = viewportRef.current;
    if (!viewport || viewport.clientWidth <= 0 || viewport.clientHeight <= 0) return;

    hasAutoFittedRef.current = true;
    void fitToPage();
  }, [fitToPage, pdfDoc]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        setIsRendering(true);
        setViewerError(null);
        cancelActiveRender();

        const pageNumber = state.document.currentPageIndex + 1;
        const page = await getCachedPage(pageNumber, pdfDoc);
        if (cancelled || !page) return;

        const renderViewport = page.getViewport({ scale: renderScale });
        const outputScale = getDevicePixelScale(!initialPaintDoneRef.current);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
        if (!context) {
          throw new Error("Failed to get 2D canvas context.");
        }

        const pixelWidth = Math.max(1, Math.floor(renderViewport.width * outputScale));
        const pixelHeight = Math.max(1, Math.floor(renderViewport.height * outputScale));

        if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
        if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

        canvas.style.width = `${pageSize.width}px`;
        canvas.style.height = `${pageSize.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, renderViewport.width, renderViewport.height);

        const renderTask = page.render({
          canvasContext: context,
          viewport: renderViewport,
        });

        renderTaskRef.current = renderTask;

        try {
          await renderTask.promise;
          initialPaintDoneRef.current = true;
        } catch (error: unknown) {
          const maybeError = error as { name?: string };
          if (maybeError?.name !== "RenderingCancelledException") {
            throw error;
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to render PDF page:", error);
        setViewerError(
          error instanceof Error ? error.message : "Failed to render page."
        );
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      cancelActiveRender();
    };
  }, [
    cancelActiveRender,
    getCachedPage,
    pageSize.height,
    pageSize.width,
    pdfDoc,
    renderScale,
    state.document.currentPageIndex,
  ]);

  useEffect(() => {
    if (!pdfDoc) return;

    if (prefetchTimeoutRef.current != null) {
      window.clearTimeout(prefetchTimeoutRef.current);
    }

    prefetchTimeoutRef.current = window.setTimeout(() => {
      const currentPageNumber = state.document.currentPageIndex + 1;
      const candidates = [currentPageNumber - 1, currentPageNumber + 1, currentPageNumber + 2];

      candidates.forEach((pageNumber) => {
        if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return;
        void getCachedPage(pageNumber, pdfDoc).catch(() => undefined);
      });
    }, PREFETCH_SETTLE_MS);

    return () => {
      if (prefetchTimeoutRef.current != null) {
        window.clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, [getCachedPage, pdfDoc, state.document.currentPageIndex]);

  useEffect(() => {
    return () => {
      cancelActiveRender();
      void destroyCurrentPdfDoc();
    };
  }, [cancelActiveRender, destroyCurrentPdfDoc]);

  const draftBounds = useMemo(() => {
    if (!draftStart || !draftCurrent) return null;

    const x = Math.min(draftStart.x, draftCurrent.x);
    const y = Math.min(draftStart.y, draftCurrent.y);
    const width = Math.abs(draftCurrent.x - draftStart.x);
    const height = Math.abs(draftCurrent.y - draftStart.y);

    if (width < 2 || height < 2) return null;

    return { x, y, width, height };
  }, [draftCurrent, draftStart]);

  const draftItemMarkup: RectangleMarkup | null = useMemo(() => {
    if (!isItemBoxTool || !draftBounds) return null;

    return {
      id: "draft-item",
      type: "takeoff_item",
      pageIndex: state.document.currentPageIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subject: "New Takeoff Item",
      comment: "",
      style: {
        strokeColor: "#2563eb",
        fillColor: "#93c5fd",
        strokeWidth: 2,
        opacity: 0.35,
      },
      material: {
        category: "other",
        materialName: "",
      },
      bounds: draftBounds,
    };
  }, [draftBounds, isItemBoxTool, state.document.currentPageIndex]);

  const draftAreaMarkup: RectangleMarkup | null = useMemo(() => {
    if (!isAreaTool || !draftBounds) return null;

    const realArea = getRealAreaFromPixelArea(draftBounds.width * draftBounds.height);

    return {
      id: "draft-area",
      type: "measure-area",
      pageIndex: state.document.currentPageIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subject: "Area Measurement",
      comment: "",
      style: {
        strokeColor: "#f59e0b",
        fillColor: "#fde68a",
        strokeWidth: 2,
        opacity: 0.28,
      },
      bounds: draftBounds,
      measurementValue:
        realArea !== null
          ? formatMeasuredValue(realArea, state.calibration.precision)
          : undefined,
      measurementUnit: state.calibration.realWorldUnit,
    };
  }, [
    draftBounds,
    getRealAreaFromPixelArea,
    isAreaTool,
    state.calibration,
    state.document.currentPageIndex,
  ]);

  const draftLine: LineMarkup | null = useMemo(() => {
    if ((!isScaleTool && !isLengthTool) || !draftStart || !draftCurrent) return null;

    const pixelDistance = getDistance(draftStart, draftCurrent);
    const realLength = isLengthTool ? getRealLengthFromPixels(pixelDistance) : null;

    return {
      id: "draft-line",
      type: isScaleTool ? "calibrate" : "measure-length",
      pageIndex: state.document.currentPageIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subject: isScaleTool ? "Scale Calibration" : "Length Measurement",
      comment: "",
      style: {
        strokeColor: isScaleTool ? "#22c55e" : "#f59e0b",
        strokeWidth: 2,
        opacity: 1,
      },
      start: draftStart,
      end: draftCurrent,
      measurementValue:
        realLength !== null
          ? formatMeasuredValue(realLength, state.calibration.precision)
          : undefined,
      measurementUnit: state.calibration.realWorldUnit,
    };
  }, [
    draftCurrent,
    draftStart,
    getRealLengthFromPixels,
    isLengthTool,
    isScaleTool,
    state.calibration,
    state.document.currentPageIndex,
  ]);

  const previewZonePoints = useMemo(() => {
    if (!isScopeZoneTool || zonePoints.length === 0) return [];
    return zoneHoverPoint ? [...zonePoints, zoneHoverPoint] : zonePoints;
  }, [isScopeZoneTool, zoneHoverPoint, zonePoints]);

  const draftZone: PlanRegion | null = useMemo(() => {
    if (!isScopeZoneTool || previewZonePoints.length < 2) return null;

    return {
      id: "draft-zone",
      pageIndex: state.document.currentPageIndex,
      name: "Draft Scope Zone",
      type: "polygon",
      points: previewZonePoints,
      bounds: getBoundsFromPoints(previewZonePoints),
      color: "#22c55e",
      areaSqFt:
        previewZonePoints.length >= 3
          ? formatMeasuredValue(
              getRealAreaFromPixelArea(getPolygonArea(previewZonePoints)) ??
                getPolygonArea(previewZonePoints),
              state.calibration.precision
            )
          : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tradeTags: [],
      categoryDefaults: [],
      supplierDefaults: [],
      notes: "",
    };
  }, [
    getRealAreaFromPixelArea,
    isScopeZoneTool,
    previewZonePoints,
    state.calibration,
    state.document.currentPageIndex,
  ]);

  const canCloseZone = useMemo(() => {
    if (!isScopeZoneTool || zonePoints.length < 3 || !zoneHoverPoint) return false;
    return getDistance(zonePoints[0], zoneHoverPoint) <= ZONE_SNAP_DISTANCE;
  }, [isScopeZoneTool, zoneHoverPoint, zonePoints]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button === 1 || isHandPanning) return;

    if (isSpacePressed && event.button === 0) {
      event.preventDefault();
      startHandPan(event.clientX, event.clientY, "space");
      return;
    }

    const point = getPagePoint(event);
    if (!point) return;

    if (isCountTool) {
      const createdCount: CountMarkup = {
        id: crypto.randomUUID(),
        type: "measure-count",
        pageIndex: state.document.currentPageIndex,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subject: "Count Item",
        comment: "",
        style: {
          strokeColor: "#ef4444",
          fillColor: "#ffffff",
          strokeWidth: 2,
          opacity: 1,
        },
        point,
        countValue: 1,
      };

      addMarkup(createdCount);
      selectMarkup(createdCount.id);
      return;
    }

    if (isItemBoxTool || isAreaTool || isScaleTool || isLengthTool) {
      clearSelection();
      setDraftStart(point);
      setDraftCurrent(point);
      return;
    }

    if (isScopeZoneTool) {
      clearSelection();

      if (zonePoints.length >= 3 && getDistance(zonePoints[0], point) <= ZONE_SNAP_DISTANCE) {
        const finalPoints = [...zonePoints];
        const pixelArea = getPolygonArea(finalPoints);
        const realArea = getRealAreaFromPixelArea(pixelArea);

        const createdZone: PlanRegion = {
          id: crypto.randomUUID(),
          pageIndex: state.document.currentPageIndex,
          name: `Scope Zone ${currentPageRegions.length + 1}`,
          type: "polygon",
          points: finalPoints,
          bounds: getBoundsFromPoints(finalPoints),
          color: "#22c55e",
          areaSqFt:
            realArea !== null
              ? formatMeasuredValue(realArea, state.calibration.precision)
              : formatMeasuredValue(pixelArea, 2),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tradeTags: [],
          categoryDefaults: [],
          supplierDefaults: [],
          notes: "",
        };

        addRegion(createdZone);
        selectRegion(createdZone.id);
        setZonePoints([]);
        setZoneHoverPoint(null);
        return;
      }

      setZonePoints((prev) => [...prev, point]);
      return;
    }

    clearSelection();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (isHandPanning) return;

    const point = getPagePoint(event);
    if (!point) return;

    if ((isItemBoxTool || isAreaTool || isScaleTool || isLengthTool) && draftStart) {
      setDraftCurrent(point);
      return;
    }

    if (isScopeZoneTool && zonePoints.length > 0) {
      setZoneHoverPoint(point);
    }
  }

  function handlePointerUp() {
    if (isHandPanning) return;

    if (isItemBoxTool && draftItemMarkup) {
      const nearestRegion = currentPageRegions.find((region) => {
        const centerX = draftItemMarkup.bounds.x + draftItemMarkup.bounds.width / 2;
        const centerY = draftItemMarkup.bounds.y + draftItemMarkup.bounds.height / 2;

        return (
          centerX >= region.bounds.x &&
          centerX <= region.bounds.x + region.bounds.width &&
          centerY >= region.bounds.y &&
          centerY <= region.bounds.y + region.bounds.height
        );
      });

      const createdMarkup: RectangleMarkup = {
        ...draftItemMarkup,
        id: crypto.randomUUID(),
        regionId: nearestRegion?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addMarkup(createdMarkup);
      selectMarkup(createdMarkup.id);
    }

    if (isAreaTool && draftAreaMarkup) {
      const createdArea: RectangleMarkup = {
        ...draftAreaMarkup,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addMarkup(createdArea);
      selectMarkup(createdArea.id);
    }

    if (isScaleTool && draftLine) {
      setCalibration({
        ...state.calibration,
        calibrationStart: draftLine.start,
        calibrationEnd: draftLine.end,
      });
      openCalibrationDialog();
    }

    if (isLengthTool && draftLine) {
      const createdLine: LineMarkup = {
        ...draftLine,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addMarkup(createdLine);
      selectMarkup(createdLine.id);
    }

    setDraftStart(null);
    setDraftCurrent(null);
  }

  const displayPageCount = Math.max(state.document.pageCount, 1);

  return (
    <div className={`relative flex h-full w-full flex-col bg-zinc-900 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Document Workspace
          </div>
          <div className="mt-1 text-sm font-semibold">
            {state.document.projectName} · Page {state.document.currentPageIndex + 1} / {displayPageCount}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {state.document.fileName || "No PDF loaded"}
          </div>
        </div>

        <ViewportControls
          zoom={zoom}
          onZoomIn={() => {
            hasUserZoomedRef.current = true;
            suppressZoomRasterRef.current = false;
            setZoom(Math.min(zoom + 0.1, MAX_ZOOM));
          }}
          onZoomOut={() => {
            hasUserZoomedRef.current = true;
            suppressZoomRasterRef.current = false;
            setZoom(Math.max(zoom - 0.1, MIN_ZOOM));
          }}
          onFit={() => {
            void fitToWidth();
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(39,39,42,0.75),rgba(9,9,11,1))]">
        <div className="min-h-0 flex-1 p-6">
          <div
            ref={viewportRef}
            className="relative h-full w-full overflow-hidden"
            onWheel={handleWheelZoom}
            onMouseDownCapture={beginMiddlePan}
            onAuxClick={handleAuxClick}
            onDoubleClick={handleDoubleClick}
            style={{
              cursor: isHandPanning || isSpacePressed ? "grab" : "default",
            }}
          >
            <div
              ref={pageRef}
              className={`absolute left-0 top-0 overflow-hidden rounded-2xl border border-zinc-700 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] ${
                isHandPanning ? "cursor-grabbing" : ""
              }`}
              style={{
                width: pageSize.width,
                height: pageSize.height,
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "top left",
                willChange: "transform",
                contain: "layout paint size style",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 block"
                style={{
                  width: pageSize.width,
                  height: pageSize.height,
                }}
              />

              {!state.document.pdfUrl ? (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                  No PDF loaded
                </div>
              ) : null}

              {viewerError ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6 text-center text-sm text-red-300">
                  {viewerError}
                </div>
              ) : null}

              {isRendering ? (
                <div className="absolute right-3 top-3 z-20 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                  Rendering…
                </div>
              ) : null}

              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {currentPageRegions.map((region) => {
                  if (region.type === "polygon" && region.points?.length) {
                    const isSelected = selectedRegion?.id === region.id;
                    const pointsAttr = region.points.map((p) => `${p.x},${p.y}`).join(" ");

                    return (
                      <g key={region.id}>
                        <polygon
                          points={pointsAttr}
                          fill={isSelected ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.08)"}
                          stroke={isSelected ? "#22c55e" : region.color}
                          strokeWidth={2}
                        />
                      </g>
                    );
                  }

                  const isSelected = selectedRegion?.id === region.id;

                  return (
                    <g key={region.id}>
                      <rect
                        x={region.bounds.x}
                        y={region.bounds.y}
                        width={region.bounds.width}
                        height={region.bounds.height}
                        fill={isSelected ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.08)"}
                        stroke={isSelected ? "#22c55e" : region.color}
                        strokeWidth={2}
                      />
                    </g>
                  );
                })}

                {draftZone?.points && draftZone.points.length > 1 ? (
                  <>
                    <polyline
                      points={draftZone.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill={draftZone.points.length >= 3 ? "rgba(34,197,94,0.12)" : "none"}
                      stroke={canCloseZone ? "#f59e0b" : "#22c55e"}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    {zonePoints.map((point, index) => (
                      <circle
                        key={`${point.x}-${point.y}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={index === 0 ? 6 : 4}
                        fill={index === 0 && canCloseZone ? "#f59e0b" : "#22c55e"}
                      />
                    ))}
                  </>
                ) : null}

                {draftLine ? (
                  <>
                    <line
                      x1={draftLine.start.x}
                      y1={draftLine.start.y}
                      x2={draftLine.end.x}
                      y2={draftLine.end.y}
                      stroke={draftLine.style.strokeColor}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    <circle cx={draftLine.start.x} cy={draftLine.start.y} r={4} fill={draftLine.style.strokeColor} />
                    <circle cx={draftLine.end.x} cy={draftLine.end.y} r={4} fill={draftLine.style.strokeColor} />
                  </>
                ) : null}
              </svg>

              <MarkupOverlay
                markups={[
                  ...currentPageMarkups,
                  ...(draftItemMarkup ? [draftItemMarkup] : []),
                  ...(draftAreaMarkup ? [draftAreaMarkup] : []),
                  ...(draftLine ? [draftLine] : []),
                ]}
                selectedMarkupIds={state.selection.selectedMarkupIds}
                onSelectMarkup={selectMarkup}
              />

              <SelectionOverlay markup={selectedMarkup} />
            </div>

            <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
              {Math.round(zoom * 100)}% · {isSpacePressed ? "Hand Tool" : "Viewer"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="text-xs text-zinc-400">
            Page {state.document.currentPageIndex + 1} of {displayPageCount}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(0, state.document.currentPageIndex - 1))}
              disabled={state.document.currentPageIndex <= 0}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 disabled:opacity-40"
            >
              ← Prev
            </button>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200">
              {state.document.currentPageIndex + 1}
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  Math.min(displayPageCount - 1, state.document.currentPageIndex + 1)
                )
              }
              disabled={state.document.currentPageIndex >= displayPageCount - 1}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

