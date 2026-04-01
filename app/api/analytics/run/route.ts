import { runDocumentAnalysis } from '@/lib/ai-analysis-engine'

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json()
    if (!documentId) {
      return Response.json({ error: 'documentId required' }, { status: 400 })
    }
    const result = await runDocumentAnalysis(documentId)
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
