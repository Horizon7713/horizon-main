export type ViewerTool =
  | "select"
  | "pan"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text"
  | "measure-length"
  | "measure-area"
  | "measure-count"
  | "calibrate"
  | "region-rectangle";

export type ViewerSidebarTab =
  | "markups"
  | "properties"
  | "regions"
  | "takeoffs"
  | "qr"
  | "thumbnails";

export type LengthUnit = "in" | "ft" | "mm" | "cm" | "m";

export type MaterialCategory =
  | "lumber"
  | "steel"
  | "hardware"
  | "cabinets"
  | "tile"
  | "finishes"
  | "concrete"
  | "roofing"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "other";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarkupStyle {
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  opacity: number;
  dashArray?: number[];
  fontSize?: number;
  textColor?: string;
}

export interface MeasurementCalibration {
  scaleRatio: number;
  drawingUnit: LengthUnit;
  realWorldUnit: LengthUnit;
  precision: number;
  isCalibrated: boolean;
  calibrationStart?: Point;
  calibrationEnd?: Point;
  lastKnownLength?: number;
}

export interface MaterialData {
  category: MaterialCategory;
  materialName: string;
  materialCode?: string;
  quantity?: number;
  unit?: string;
  supplier?: string;
  trade?: string;
  notes?: string;
  includeInQr?: boolean;
}

export interface PlanRegion {
  id: string;
  pageIndex: number;
  name: string;
  type: "rectangle" | "polygon";
  bounds: Rect;
  points?: Point[];
  color: string;
  areaSqFt?: number;
  createdAt: string;
  updatedAt: string;
  tradeTags?: string[];
  categoryDefaults?: MaterialCategory[];
  supplierDefaults?: string[];
  notes?: string;
}

export interface BaseMarkup {
  id: string;
  type: string;
  pageIndex: number;
  createdAt: string;
  updatedAt: string;
  author?: string;
  subject?: string;
  comment?: string;
  locked?: boolean;
  regionId?: string;
  material?: MaterialData;
  style: MarkupStyle;
}

export interface RectangleMarkup extends BaseMarkup {
  type: "rectangle" | "highlight" | "takeoff_item" | "measure-area";
  bounds: Rect;
  measurementValue?: number;
  measurementUnit?: string;
}

export interface EllipseMarkup extends BaseMarkup {
  type: "ellipse" | "cloud";
  bounds: Rect;
}

export interface LineMarkup extends BaseMarkup {
  type: "line" | "arrow" | "measure-length" | "calibrate";
  start: Point;
  end: Point;
  measurementValue?: number;
  measurementUnit?: string;
}

export interface CountMarkup extends BaseMarkup {
  type: "measure-count";
  point: Point;
  countValue: number;
}

export interface TextMarkup extends BaseMarkup {
  type: "text" | "callout" | "stamp";
  bounds: Rect;
  text: string;
}

export type PdfMarkup =
  | RectangleMarkup
  | EllipseMarkup
  | LineMarkup
  | CountMarkup
  | TextMarkup;

export interface QrPayload {
  id: string;
  projectName: string;
  version: string;
  regionId?: string;
  category?: MaterialCategory;
  supplier?: string;
  title: string;
  description?: string;
  generatedAt: string;
  materials: Array<{
    markupId: string;
    regionName?: string;
    category: MaterialCategory;
    materialName: string;
    materialCode?: string;
    quantity?: number;
    unit?: string;
    supplier?: string;
    trade?: string;
    notes?: string;
  }>;
}

export interface ViewerDocumentState {
  pdfFileId?: string;
  documentId?: string;
  fileName?: string;
  pageCount: number;
  currentPageIndex: number;
  projectName: string;
  pdfObjectKey?: string;
  pdfUrl?: string;
}

export interface PageViewportState {
  pageIndex: number;
  zoom: number;
  rotation: number;
  panX: number;
  panY: number;
}

export interface ViewerSelectionState {
  selectedMarkupIds: string[];
  selectedRegionId?: string;
  hoveredMarkupId?: string;
}

export interface ViewerUiState {
  activeTool: ViewerTool;
  activeSidebarTab: ViewerSidebarTab;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  isCalibrationDialogOpen: boolean;
}

export interface ViewerState {
  document: ViewerDocumentState;
  viewport: PageViewportState;
  selection: ViewerSelectionState;
  ui: ViewerUiState;
  calibration: MeasurementCalibration;
  markups: PdfMarkup[];
  regions: PlanRegion[];
  qrPayloads: QrPayload[];
}

export type ViewerAction =
  | { type: "SET_ACTIVE_TOOL"; payload: ViewerTool }
  | { type: "SET_SIDEBAR_TAB"; payload: ViewerSidebarTab }
  | { type: "SET_CURRENT_PAGE"; payload: number }
  | { type: "SET_PAGE_COUNT"; payload: number }
  | { type: "SET_PROJECT_NAME"; payload: string }
  | { type: "SET_FILE_NAME"; payload: string | undefined }
  | { type: "SET_PDF_FILE_ID"; payload: string | undefined }
  | { type: "SET_PDF_SOURCE"; payload: { pdfObjectKey?: string; pdfUrl?: string } }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SET_PAN"; payload: { panX: number; panY: number } }
  | { type: "SET_ROTATION"; payload: number }
  | { type: "OPEN_CALIBRATION_DIALOG" }
  | { type: "CLOSE_CALIBRATION_DIALOG" }
  | { type: "SET_CALIBRATION"; payload: MeasurementCalibration }
  | { type: "ADD_MARKUP"; payload: PdfMarkup }
  | { type: "UPDATE_MARKUP"; payload: PdfMarkup }
  | { type: "DELETE_MARKUP"; payload: string }
  | { type: "SET_MARKUPS"; payload: PdfMarkup[] }
  | { type: "SELECT_MARKUP"; payload: string }
  | { type: "SET_SELECTED_MARKUPS"; payload: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "ADD_REGION"; payload: PlanRegion }
  | { type: "UPDATE_REGION"; payload: PlanRegion }
  | { type: "DELETE_REGION"; payload: string }
  | { type: "SET_REGIONS"; payload: PlanRegion[] }
  | { type: "SELECT_REGION"; payload: string | undefined }
  | { type: "SET_QR_PAYLOADS"; payload: QrPayload[] }
  | { type: "SET_LEFT_SIDEBAR_OPEN"; payload: boolean }
  | { type: "SET_RIGHT_SIDEBAR_OPEN"; payload: boolean };