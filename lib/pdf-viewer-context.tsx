"use client";

import React, { createContext, useContext, useMemo, useReducer } from "react";
import type {
  MeasurementCalibration,
  PdfMarkup,
  PlanRegion,
  QrPayload,
  ViewerSidebarTab,
  ViewerState,
  ViewerTool,
} from "./pdf-viewer-types";
import { initialViewerState, viewerReducer } from "./tool-state-machine";

interface PdfViewerContextValue {
  state: ViewerState;
  setActiveTool: (tool: ViewerTool) => void;
  setSidebarTab: (tab: ViewerSidebarTab) => void;
  setCurrentPage: (pageIndex: number) => void;
  setPageCount: (pageCount: number) => void;
  setProjectName: (projectName: string) => void;
  setFileName: (fileName: string | undefined) => void;
  setPdfFileId: (pdfFileId: string | undefined) => void;
  setPdfSource: (payload: { pdfObjectKey?: string; pdfUrl?: string }) => void;
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  setRotation: (rotation: number) => void;
  openCalibrationDialog: () => void;
  closeCalibrationDialog: () => void;
  setCalibration: (calibration: MeasurementCalibration) => void;
  addMarkup: (markup: PdfMarkup) => void;
  updateMarkup: (markup: PdfMarkup) => void;
  deleteMarkup: (markupId: string) => void;
  setMarkups: (markups: PdfMarkup[]) => void;
  selectMarkup: (markupId: string) => void;
  clearSelection: () => void;
  addRegion: (region: PlanRegion) => void;
  updateRegion: (region: PlanRegion) => void;
  deleteRegion: (regionId: string) => void;
  setRegions: (regions: PlanRegion[]) => void;
  selectRegion: (regionId: string | undefined) => void;
  setQrPayloads: (payloads: QrPayload[]) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
}

const PdfViewerContext = createContext<PdfViewerContextValue | null>(null);

export function PdfViewerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(viewerReducer, initialViewerState);

  const value = useMemo<PdfViewerContextValue>(
    () => ({
      state,

      setActiveTool: (tool) => {
        if (state.ui.activeTool === tool) return;
        dispatch({ type: "SET_ACTIVE_TOOL", payload: tool });
      },

      setSidebarTab: (tab) => {
        if (state.ui.activeSidebarTab === tab) return;
        dispatch({ type: "SET_SIDEBAR_TAB", payload: tab });
      },

      setCurrentPage: (pageIndex) => {
        if (state.document.currentPageIndex === pageIndex) return;
        dispatch({ type: "SET_CURRENT_PAGE", payload: pageIndex });
      },

      setPageCount: (pageCount) => {
        if (state.document.pageCount === pageCount) return;
        dispatch({ type: "SET_PAGE_COUNT", payload: pageCount });
      },

      setProjectName: (projectName) => {
        if (state.document.projectName === projectName) return;
        dispatch({ type: "SET_PROJECT_NAME", payload: projectName });
      },

      setFileName: (fileName) => {
        if (state.document.fileName === fileName) return;
        dispatch({ type: "SET_FILE_NAME", payload: fileName });
      },

      setPdfFileId: (pdfFileId) => {
        if (state.document.pdfFileId === pdfFileId) return;
        dispatch({ type: "SET_PDF_FILE_ID", payload: pdfFileId });
      },

      setPdfSource: (payload) => {
        const nextObjectKey = payload.pdfObjectKey;
        const nextPdfUrl = payload.pdfUrl;

        if (
          state.document.pdfObjectKey === nextObjectKey &&
          state.document.pdfUrl === nextPdfUrl
        ) {
          return;
        }

        dispatch({ type: "SET_PDF_SOURCE", payload });
      },

      setZoom: (zoom) => {
        if (state.viewport.zoom === zoom) return;
        dispatch({ type: "SET_ZOOM", payload: zoom });
      },

      setPan: (panX, panY) => {
        if (
          state.viewport.panX === panX &&
          state.viewport.panY === panY
        ) {
          return;
        }

        dispatch({ type: "SET_PAN", payload: { panX, panY } });
      },

      setRotation: (rotation) => {
        if (state.viewport.rotation === rotation) return;
        dispatch({ type: "SET_ROTATION", payload: rotation });
      },

      openCalibrationDialog: () => {
        if (state.ui.isCalibrationDialogOpen) return;
        dispatch({ type: "OPEN_CALIBRATION_DIALOG" });
      },

      closeCalibrationDialog: () => {
        if (!state.ui.isCalibrationDialogOpen) return;
        dispatch({ type: "CLOSE_CALIBRATION_DIALOG" });
      },

      setCalibration: (calibration) => {
        if (state.calibration === calibration) return;
        dispatch({ type: "SET_CALIBRATION", payload: calibration });
      },

      addMarkup: (markup) => {
        dispatch({ type: "ADD_MARKUP", payload: markup });
      },

      updateMarkup: (markup) => {
        dispatch({ type: "UPDATE_MARKUP", payload: markup });
      },

      deleteMarkup: (markupId) => {
        dispatch({ type: "DELETE_MARKUP", payload: markupId });
      },

      setMarkups: (markups) => {
        if (state.markups === markups) return;
        dispatch({ type: "SET_MARKUPS", payload: markups });
      },

      selectMarkup: (markupId) => {
        if (
          state.selection.selectedMarkupIds.length === 1 &&
          state.selection.selectedMarkupIds[0] === markupId
        ) {
          return;
        }

        dispatch({ type: "SELECT_MARKUP", payload: markupId });
      },

      clearSelection: () => {
        if (
          state.selection.selectedMarkupIds.length === 0 &&
          !state.selection.selectedRegionId
        ) {
          return;
        }

        dispatch({ type: "CLEAR_SELECTION" });
      },

      addRegion: (region) => {
        dispatch({ type: "ADD_REGION", payload: region });
      },

      updateRegion: (region) => {
        dispatch({ type: "UPDATE_REGION", payload: region });
      },

      deleteRegion: (regionId) => {
        dispatch({ type: "DELETE_REGION", payload: regionId });
      },

      setRegions: (regions) => {
        if (state.regions === regions) return;
        dispatch({ type: "SET_REGIONS", payload: regions });
      },

      selectRegion: (regionId) => {
        if (state.selection.selectedRegionId === regionId) return;
        dispatch({ type: "SELECT_REGION", payload: regionId });
      },

      setQrPayloads: (payloads) => {
        if (state.qrPayloads === payloads) return;
        dispatch({ type: "SET_QR_PAYLOADS", payload: payloads });
      },

      setLeftSidebarOpen: (open) => {
        if (state.ui.leftSidebarOpen === open) return;
        dispatch({ type: "SET_LEFT_SIDEBAR_OPEN", payload: open });
      },

      setRightSidebarOpen: (open) => {
        if (state.ui.rightSidebarOpen === open) return;
        dispatch({ type: "SET_RIGHT_SIDEBAR_OPEN", payload: open });
      },
    }),
    [state]
  );

  return (
    <PdfViewerContext.Provider value={value}>
      {children}
    </PdfViewerContext.Provider>
  );
}

export function usePdfViewer() {
  const context = useContext(PdfViewerContext);

  if (!context) {
    throw new Error("usePdfViewer must be used within a PdfViewerProvider");
  }

  return context;
}


