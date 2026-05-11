import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  buildPublicFileUrl,
  getR2BucketName,
  getR2Client,
} from "@/lib/cloudflare-r2"

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120)
}

function getExtension(fileName: string, contentType: string) {
  const nameExtension = fileName.split(".").pop()?.toLowerCase()

  if (nameExtension && /^[a-z0-9]+$/.test(nameExtension)) {
    return nameExtension
  }

  if (contentType === "application/pdf") return "pdf"
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  if (contentType === "image/heic") return "heic"
  if (contentType === "image/heif") return "heif"

  return "jpg"
}

function getFolder(type?: string, folder?: string) {
  const safeFolder = String(folder || "").replace(/[^a-zA-Z0-9/_-]/g, "")

  if (safeFolder) return safeFolder
  if (type === "receipt") return "receipts"
  if (type === "timecard") return "timecards"

  return "uploads"
}

function buildObjectKey({
  fileName,
  contentType,
  folder,
  type,
  projectId,
}: {
  fileName: string
  contentType: string
  folder?: string
  type?: string
  projectId?: string | null
}) {
  const safeFileName = sanitizeFileName(fileName)
  const extension = getExtension(safeFileName, contentType)
  const baseFolder = getFolder(type, folder)
  const dateFolder = new Date().toISOString().slice(0, 10)
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const safeProjectId =
    projectId && typeof projectId === "string"
      ? projectId.replace(/[^a-zA-Z0-9_-]/g, "")
      : "no-project"

  return `${baseFolder}/${safeProjectId}/${dateFolder}/${id}-${safeFileName.replace(
    /\.[^.]+$/,
    "",
  )}.${extension}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const fileName = body?.fileName || body?.filename
    const contentType = body?.contentType || body?.mimeType
    const folder = body?.folder
    const type = body?.type
    const projectId = body?.projectId || null

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 })
    }

    if (!contentType || typeof contentType !== "string") {
      return NextResponse.json({ error: "Missing contentType" }, { status: 400 })
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Only PDF and image files are allowed" },
        { status: 400 },
      )
    }

    const objectKey = buildObjectKey({
      fileName,
      contentType,
      folder,
      type,
      projectId,
    })

    const r2Client = getR2Client()
    const r2BucketName = getR2BucketName()

    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: objectKey,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 60 * 5,
    })

    const fileUrl = buildPublicFileUrl(objectKey)

    return NextResponse.json({
      uploadUrl,
      signedUrl: uploadUrl,
      objectKey,
      key: objectKey,
      fileName,
      fileUrl,
      publicUrl: fileUrl,
      url: fileUrl,
      contentType,
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