import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { put } from "@vercel/blob";
import { config } from "../config.ts";
import { HttpError } from "./errors.ts";

// Vercel Blob when BLOB_READ_WRITE_TOKEN is set (serverless disk is ephemeral); otherwise local disk served at /uploads.
export const uploadDir = resolve(config.UPLOAD_DIR);
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

// Decide the type from the file's own bytes, never from the client's filename or MIME header.
function sniff(buf: Buffer): "png" | "jpg" | "webp" | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function saveImage(buf: Buffer): Promise<string> {
  const ext = sniff(buf);
  if (!ext) throw new HttpError(415, "Upload a PNG, JPEG or WebP image.");
  if (buf.length > MAX_UPLOAD_BYTES) throw new HttpError(413, "Images must be 3 MB or smaller.");
  const name = `${randomUUID()}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, buf, { access: "public", addRandomSuffix: false, contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}` });
    return blob.url;
  }
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, name), buf);
  return `/uploads/${name}`;
}
