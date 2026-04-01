import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'Blob storage token not configured' }, { status: 500 })
    }

    const rawFilename = request.headers.get('x-filename') || 'upload.pdf'
    const filename = decodeURIComponent(rawFilename)
    const contentType = request.headers.get('content-type') || 'application/pdf'

    // Buffer the body to get exact size. Edge runtime strips content-length from streams.
    const buffer = await request.arrayBuffer()
    const size = buffer.byteLength

    if (size === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', details: `${(size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 },
      )
    }

    // Pass buffered body with explicit contentLength so put() can set x-content-length header
    const blob = await put(filename, buffer, {
      access: 'public',
      token,
      addRandomSuffix: true,
      contentType,
    })

    return NextResponse.json({ url: blob.url, filename, size, type: contentType })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Upload failed', details: msg }, { status: 500 })
  }
}
