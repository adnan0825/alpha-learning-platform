import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import { getPublicBaseUrl } from "./runtime";

export interface StorageConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  customDomain: string;
}

export function getStorageConfig(): StorageConfig {
  return {
    endpoint: (process.env.R2_ENDPOINT || "").trim(),
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "").trim(),
    bucket: (process.env.R2_BUCKET || "").trim(),
    publicUrl: (process.env.R2_PUBLIC_URL || process.env.R2_CUSTOM_DOMAIN || "").trim(),
    customDomain: (process.env.R2_CUSTOM_DOMAIN || "").trim(),
  };
}

export function isR2Enabled(): boolean {
  const { endpoint, accessKeyId, secretAccessKey, bucket } = getStorageConfig();
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucket);
}

export function getStorageObjectKey(filename: string, folder: "uploads" | "videos") {
  if (!filename) return folder;
  return `${folder}/${filename}`;
}

export function getStoragePublicUrl(filename: string, folder: "uploads" | "videos") {
  const key = getStorageObjectKey(filename, folder);
  const { publicUrl } = getStorageConfig();

  if (publicUrl) {
    const normalizedBase = publicUrl.replace(/\/$/, "");
    return new URL(key, `${normalizedBase}/`).toString();
  }

  const baseUrl = getPublicBaseUrl();
  if (baseUrl) {
    const normalizedBase = baseUrl.replace(/\/$/, "");
    return new URL(key, `${normalizedBase}/`).toString();
  }

  return `/${key}`;
}

export function getR2Client(): S3Client | null {
  const { endpoint, accessKeyId, secretAccessKey, bucket } = getStorageConfig();
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function uploadBufferToStorage({
  filePath,
  key,
  contentType,
  folder,
}: {
  filePath: string;
  key: string;
  contentType: string;
  folder: "uploads" | "videos";
}): Promise<string> {
  const client = getR2Client();
  const bucket = getStorageConfig().bucket;

  if (!client || !bucket) {
    return getStoragePublicUrl(path.basename(filePath), folder);
  }

  const buffer = fs.readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  fs.rmSync(filePath, { force: true });
  return getStoragePublicUrl(path.basename(key), folder);
}

export async function getSignedObjectUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const client = getR2Client();
  const bucket = getStorageConfig().bucket;
  if (!client || !bucket) {
    return `/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
