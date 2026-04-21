import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export const r2AccountId = requireEnv("CLOUDFLARE_R2_ACCOUNT_ID");
export const r2AccessKeyId = requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
export const r2SecretAccessKey = requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
export const r2BucketName = requireEnv("CLOUDFLARE_R2_BUCKET");
export const r2PublicUrl =
  process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

export function buildPdfObjectKey(fileName: string) {
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  return `pdfs/${Date.now()}-${safeName}`;
}

export function buildPublicFileUrl(objectKey: string) {
  if (!r2PublicUrl) return null;
  return `${r2PublicUrl}/${objectKey}`;
}