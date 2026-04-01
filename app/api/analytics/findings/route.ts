import { getAnalysisFindings } from '@/lib/ai-analysis-engine'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')
  if (!runId) return Response.json([], { status: 200 })

  try {
    const findings = await getAnalysisFindings(runId)
    return Response.json(findings)
  } catch {
    return Response.json([], { status: 200 })
  }
}
