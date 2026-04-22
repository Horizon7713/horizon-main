type PdfJsLib = {
  GlobalWorkerOptions: {
    workerSrc: string
  }
  getDocument: (...args: any[]) => any
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib
  }
}

export {}