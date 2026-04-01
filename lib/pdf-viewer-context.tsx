'use client'

/**
 * PDF Viewer State Context
 * Manages complex state for PDF viewer including markups, UI state, and collaboration
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { Markup, DrawingScale, MarkupType, PageScale } from '@/lib/pdf-viewer-types'

export interface PDFViewerContextState {
  // PDF State
  pdfFileId: string | null
  currentPage: number
  totalPages: number
  zoom: number
  panX: number
  panY: number

  // Markup State
  markups: Markup[]
  selectedMarkupId: string | null
  activeTool: MarkupType | null
  drawingScale: DrawingScale | null
  pageScales: PageScale[]

  // UI State
  activePanel: 'properties' | 'markups' | 'history' | 'comments' | null
  sidebarWidth: number
  showToolLabels: boolean

  // Collaboration State
  activeSessions: Array<{ userId: string; userName: string; currentPage: number }>
  comments: Record<string, any[]>
  markupVersions: Record<string, any[]>
}

export type PDFViewerAction =
  | { type: 'SET_PDF'; payload: { pdfFileId: string; totalPages: number } }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'ADD_MARKUP'; payload: Markup }
  | { type: 'UPDATE_MARKUP'; payload: Markup }
  | { type: 'DELETE_MARKUP'; payload: string }
  | { type: 'SET_MARKUPS'; payload: Markup[] }
  | { type: 'SELECT_MARKUP'; payload: string | null }
  | { type: 'SET_ACTIVE_TOOL'; payload: MarkupType | null }
  | { type: 'SET_DRAWING_SCALE'; payload: DrawingScale | null }
  | { type: 'SET_PAGE_SCALE'; payload: PageScale }
  | { type: 'SET_ACTIVE_PANEL'; payload: 'properties' | 'markups' | 'history' | 'comments' | null }
  | { type: 'SET_SIDEBAR_WIDTH'; payload: number }
  | { type: 'UPDATE_ACTIVE_SESSIONS'; payload: any[] }
  | { type: 'UPDATE_COMMENTS'; payload: { markupId: string; comments: any[] } }
  | { type: 'UPDATE_MARKUP_VERSIONS'; payload: { markupId: string; versions: any[] } }

const initialState: PDFViewerContextState = {
  pdfFileId: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  markups: [],
  selectedMarkupId: null,
  activeTool: 'select',
  drawingScale: null,
  pageScales: [],
  activePanel: 'properties',
  sidebarWidth: 320,
  showToolLabels: false,
  activeSessions: [],
  comments: {},
  markupVersions: {},
}

function pdfViewerReducer(state: PDFViewerContextState, action: PDFViewerAction): PDFViewerContextState {
  switch (action.type) {
    case 'SET_PDF':
      return { ...state, pdfFileId: action.payload.pdfFileId, totalPages: action.payload.totalPages }
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload }
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload }
    case 'SET_PAN':
      return { ...state, panX: action.payload.x, panY: action.payload.y }
    case 'ADD_MARKUP':
      return { ...state, markups: [...state.markups, action.payload] }
    case 'UPDATE_MARKUP':
      return {
        ...state,
        markups: state.markups.map((m) => (m.id === action.payload.id ? action.payload : m)),
      }
    case 'DELETE_MARKUP':
      return {
        ...state,
        markups: state.markups.filter((m) => m.id !== action.payload),
        selectedMarkupId: state.selectedMarkupId === action.payload ? null : state.selectedMarkupId,
      }
    case 'SET_MARKUPS':
      return { ...state, markups: action.payload }
    case 'SELECT_MARKUP':
      return { ...state, selectedMarkupId: action.payload }
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload }
    case 'SET_DRAWING_SCALE':
      return { ...state, drawingScale: action.payload }
    case 'SET_PAGE_SCALE': {
      const existing = state.pageScales.filter((s) => s.pageNumber !== action.payload.pageNumber)
      return { ...state, pageScales: [...existing, action.payload] }
    }
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.payload }
    case 'SET_SIDEBAR_WIDTH':
      return { ...state, sidebarWidth: action.payload }
    case 'UPDATE_ACTIVE_SESSIONS':
      return { ...state, activeSessions: action.payload }
    case 'UPDATE_COMMENTS':
      return {
        ...state,
        comments: { ...state.comments, [action.payload.markupId]: action.payload.comments },
      }
    case 'UPDATE_MARKUP_VERSIONS':
      return {
        ...state,
        markupVersions: { ...state.markupVersions, [action.payload.markupId]: action.payload.versions },
      }
    default:
      return state
  }
}

interface PDFViewerContextType {
  state: PDFViewerContextState
  dispatch: React.Dispatch<PDFViewerAction>
}

const PDFViewerContext = createContext<PDFViewerContextType | undefined>(undefined)

export interface PDFViewerProviderProps {
  children: ReactNode
}

export function PDFViewerProvider({ children }: PDFViewerProviderProps) {
  const [state, dispatch] = useReducer(pdfViewerReducer, initialState)

  return (
    <PDFViewerContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFViewerContext.Provider>
  )
}

export function usePDFViewer() {
  const context = useContext(PDFViewerContext)
  if (!context) {
    throw new Error('usePDFViewer must be used within PDFViewerProvider')
  }
  return context
}
