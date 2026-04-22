import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const bucket = process.env.CLOUDFLARE_R2_BUCKET
const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL

function getR2Client() {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 environment variables are not fully configured.")
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(req: NextRequest) {
  try {
    if (!publicUrlBase) {
      return NextResponse.json(
        { error: "CLOUDFLARE_R2_PUBLIC_URL is not configured." },
        { status: 500 },
      )
    }

    const contentType =
      req.headers.get("content-type") || "application/octet-stream"
    const encodedName = req.headers.get("x-filename") || "upload.bin"
    const fileName = decodeURIComponent(encodedName)
    const safeName = sanitizeFilename(fileName)

    const body = Buffer.from(await req.arrayBuffer())
    if (!body.length) {
      return NextResponse.json({ error: "Empty upload body." }, { status: 400 })
    }

    const key = `uploads/${Date.now()}-${safeName}`
    const client = getR2Client()

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )

    const url = `${publicUrlBase.replace(/\/$/, "")}/${key}`

    return NextResponse.json({
      success: true,
      url,
      key,
      fileName,
      contentType,
      size: body.length,
    })
  } catch (error) {
    console.error("[UPLOAD] R2 upload failed:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}