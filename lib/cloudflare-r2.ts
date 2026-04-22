import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getR2AccountId() {
  return requireEnv("CLOUDFLARE_R2_ACCOUNT_ID");
}

export function getR2AccessKeyId() {
  return requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
}

export function getR2SecretAccessKey() {
  return requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
}

export function getR2BucketName() {
  return requireEnv("CLOUDFLARE_R2_BUCKET");
}

export function getR2PublicUrl() {
  return process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
}

export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${getR2AccountId()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getR2AccessKeyId(),
      secretAccessKey: getR2SecretAccessKey(),
    },
  });
}

export function buildPdfObjectKey(fileName: string) {
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  return `pdfs/${Date.now()}-${safeName}`;
}

export function buildPublicFileUrl(objectKey: string) {
  const r2PublicUrl = getR2PublicUrl();
  if (!r2PublicUrl) return null;
  return `${r2PublicUrl}/${objectKey}`;
}