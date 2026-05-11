import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  buildPdfObjectKey,
  buildPublicFileUrl,
  getR2BucketName,
  getR2Client,
} from "@/lib/cloudflare-r2"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const fileName = body?.fileName
    const contentType = body?.contentType

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 })
    }

    if (contentType !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 },
      )
    }

    const objectKey = buildPdfObjectKey(fileName)
    const r2Client = getR2Client()
    const r2BucketName = getR2BucketName()

    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: objectKey,
      ContentType: "application/pdf",
    })

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 60 * 5,
    })

    return NextResponse.json({
      uploadUrl,
      objectKey,
      fileName,
      fileUrl: buildPublicFileUrl(objectKey),
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