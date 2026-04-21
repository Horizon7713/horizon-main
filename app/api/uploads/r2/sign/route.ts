import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  buildPdfObjectKey,
  buildPublicFileUrl,
  r2BucketName,
  r2Client,
} from "@/lib/cloudflare-r2";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    const objectKey = buildPdfObjectKey(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    return NextResponse.json({
      objectKey,
      fileName: file.name,
      fileUrl: buildPublicFileUrl(objectKey),
    });
  } catch (error) {
    console.error("R2 upload route failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}