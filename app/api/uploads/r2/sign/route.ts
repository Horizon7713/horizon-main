import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  buildPublicFileUrl,
  getR2BucketName,
  getR2Client,
} from "@/lib/cloudflare-r2"

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
])

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getExtension(fileName: string, contentType: string) {
  const existingExtension = fileName.split(".").pop()

  if (existingExtension && existingExtension !== fileName) {
    return existingExtension.toLowerCase()
  }

  if (contentType === "application/pdf") return "pdf"
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"

  return "jpg"
}

function buildUploadObjectKey({
  fileName,
  contentType,
  folder,
  projectId,
}: {
  fileName: string
  contentType: string
  folder: string
  projectId?: string | null
}) {
  const safeFolder = sanitizeFileName(folder || "uploads")
  const safeProject = projectId ? sanitizeFileName(projectId) : "general"
  const safeBaseName = sanitizeFileName(fileName.replace(/\.[^/.]+$/, ""))
  const extension = getExtension(fileName, contentType)
  const timestamp = Date.now()
  const random = crypto.randomUUID()

  return `${safeFolder}/${safeProject}/${timestamp}-${random}-${safeBaseName}.${extension}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const fileName = body?.fileName || body?.filename
    const contentType = body?.contentType || body?.mimeType
    const folder = body?.folder || "uploads"
    const projectId = body?.projectId || null

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 })
    }

    if (!contentType || typeof contentType !== "string") {
      return NextResponse.json({ error: "Missing contentType" }, { status: 400 })
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          error: "Only PDF, JPG, PNG, and WEBP files are allowed",
        },
        { status: 400 },
      )
    }

    const objectKey = buildUploadObjectKey({
      fileName,
      contentType,
      folder,
      projectId,
    })

    const command = new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: 60 * 5,
    })

    const fileUrl = buildPublicFileUrl(objectKey)

    return NextResponse.json({
      uploadUrl,
      signedUrl: uploadUrl,
      objectKey,
      key: objectKey,
      fileName,
      contentType,
      fileUrl,
      publicUrl: fileUrl,
      url: fileUrl,
    })
  } catch (error) {
    console.error("R2 sign route failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate upload URL",
      },
      { status: 500 },
    )
  }
}