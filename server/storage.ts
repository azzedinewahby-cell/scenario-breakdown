// Local filesystem storage — replaces Manus storage proxy
import fs from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";

function getUploadDir(): string {
  return path.resolve(ENV.uploadDir);
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(getUploadDir(), { recursive: true });
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  await ensureUploadDir();
  const key = relKey.replace(/^\/+/, "");
  // Flatten path to avoid directory traversal
  const safeKey = key.replace(/\//g, "_");
  const filePath = path.join(getUploadDir(), safeKey);
  await fs.writeFile(filePath, data instanceof Buffer ? data : Buffer.from(data));
  const url = `/uploads/${safeKey}`;
  return { key: safeKey, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "").replace(/\//g, "_");
  return { key, url: `/uploads/${key}` };
}
