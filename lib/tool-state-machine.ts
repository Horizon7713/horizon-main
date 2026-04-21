import type { ViewerAction, ViewerState } from "./pdf-viewer-types";

export const initialViewerState: ViewerState = {
  document: {
    pdfFileId: undefined,
    documentId: undefined,
    fileName: undefined,
    pageCount: 0,
    currentPageIndex: 0,
    projectName: "Untitled Project",
    pdfObjectKey: undefined,
    pdfUrl: undefined,
  },
  viewport: {
    pageIndex: 0,
    zoom: 1,
    rotation: 0,
    panX: 0,
    panY: 0,
  },
  selection: {
    selectedMarkupIds: [],
    selectedRegionId: undefined,
    hoveredMarkupId: undefined,
  },
  ui: {
    activeTool: "select",
    activeSidebarTab: "markups",
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    isCalibrationDialogOpen: false,
  },
  calibration: {
    scaleRatio: 1,
    drawingUnit: "in",
    realWorldUnit: "ft",
    precision: 2,
    isCalibrated: false,
  },
  markups: [],
  regions: [],
  qrPayloads: [],
};

export function viewerReducer(
  state: ViewerState,
  action: ViewerAction
): ViewerState {
  switch (action.type) {
    case "SET_ACTIVE_TOOL":
      return { ...state, ui: { ...state.ui, activeTool: action.payload } };

    case "SET_SIDEBAR_TAB":
      return { ...state, ui: { ...state.ui, activeSidebarTab: action.payload } };

    case "SET_CURRENT_PAGE":
      return {
        ...state,
        document: { ...state.document, currentPageIndex: action.payload },
        viewport: { ...state.viewport, pageIndex: action.payload },
        selection: {
          ...state.selection,
          selectedMarkupIds: [],
          selectedRegionId: undefined,
        },
      };

    case "SET_PAGE_COUNT":
      return {
        ...state,
        document: { ...state.document, pageCount: action.payload },
      };

    case "SET_PROJECT_NAME":
      return {
        ...state,
        document: { ...state.document, projectName: action.payload },
      };

    case "SET_FILE_NAME":
      return {
        ...state,
        document: { ...state.document, fileName: action.payload },
      };

    case "SET_PDF_FILE_ID":
      return {
        ...state,
        document: { ...state.document, pdfFileId: action.payload },
      };

    case "SET_PDF_SOURCE":
      return {
        ...state,
        document: {
          ...state.document,
          pdfObjectKey: action.payload.pdfObjectKey,
          pdfUrl: action.payload.pdfUrl,
        },
      };

    case "SET_ZOOM":
      return { ...state, viewport: { ...state.viewport, zoom: action.payload } };

    case "SET_PAN":
      return {
        ...state,
        viewport: {
          ...state.viewport,
          panX: action.payload.panX,
          panY: action.payload.panY,
        },
      };

    case "SET_ROTATION":
      return {
        ...state,
        viewport: { ...state.viewport, rotation: action.payload },
      };

    case "OPEN_CALIBRATION_DIALOG":
      return {
        ...state,
        ui: { ...state.ui, isCalibrationDialogOpen: true },
      };

    case "CLOSE_CALIBRATION_DIALOG":
      return {
        ...state,
        ui: { ...state.ui, isCalibrationDialogOpen: false },
      };

    case "SET_CALIBRATION":
      return {
        ...state,
        calibration: action.payload,
        ui: { ...state.ui, isCalibrationDialogOpen: false },
      };

    case "ADD_MARKUP":
      return {
        ...state,
        markups: [...state.markups, action.payload],
        selection: {
          ...state.selection,
          selectedMarkupIds: [action.payload.id],
          selectedRegionId: undefined,
        },
      };

    case "UPDATE_MARKUP":
      return {
        ...state,
        markups: state.markups.map((markup) =>
          markup.id === action.payload.id ? action.payload : markup
        ),
      };

    case "DELETE_MARKUP":
      return {
        ...state,
        markups: state.markups.filter((markup) => markup.id !== action.payload),
        selection: {
          ...state.selection,
          selectedMarkupIds: state.selection.selectedMarkupIds.filter(
            (id) => id !== action.payload
          ),
        },
      };

    case "SET_MARKUPS":
      return { ...state, markups: action.payload };

    case "SELECT_MARKUP":
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedMarkupIds: [action.payload],
          selectedRegionId: undefined,
        },
      };

    case "SET_SELECTED_MARKUPS":
      return {
        ...state,
        selection: { ...state.selection, selectedMarkupIds: action.payload },
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedMarkupIds: [],
          selectedRegionId: undefined,
        },
      };

    case "ADD_REGION":
      return {
        ...state,
        regions: [...state.regions, action.payload],
        selection: {
          ...state.selection,
          selectedRegionId: action.payload.id,
          selectedMarkupIds: [],
        },
      };

    case "UPDATE_REGION":
      return {
        ...state,
        regions: state.regions.map((region) =>
          region.id === action.payload.id ? action.payload : region
        ),
      };

    case "DELETE_REGION":
      return {
        ...state,
        regions: state.regions.filter((region) => region.id !== action.payload),
        markups: state.markups.map((markup) =>
          markup.regionId === action.payload
            ? { ...markup, regionId: undefined }
            : markup
        ),
        selection: {
          ...state.selection,
          selectedRegionId:
            state.selection.selectedRegionId === action.payload
              ? undefined
              : state.selection.selectedRegionId,
        },
      };

    case "SET_REGIONS":
      return { ...state, regions: action.payload };

    case "SELECT_REGION":
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedRegionId: action.payload,
          selectedMarkupIds: [],
        },
      };

    case "SET_QR_PAYLOADS":
      return { ...state, qrPayloads: action.payload };

    case "SET_LEFT_SIDEBAR_OPEN":
      return {
        ...state,
        ui: { ...state.ui, leftSidebarOpen: action.payload },
      };

    case "SET_RIGHT_SIDEBAR_OPEN":
      return {
        ...state,
        ui: { ...state.ui, rightSidebarOpen: action.payload },
      };

    default:
      return state;
  }
}
