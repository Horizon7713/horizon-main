import { getAnalysisRuns } from '@/lib/ai-analysis-engine'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  if (!documentId) return Response.json([], { status: 200 })

  try {
    const runs = await getAnalysisRuns(documentId)
    return Response.json(runs)
  } catch {
    return Response.json([], { status: 200 })
  }
}
