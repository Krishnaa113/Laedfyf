import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAX_BYTES = 5 * 1024 * 1024;

export async function savePublicUpload(
  file: File,
  folder: "receipts" | "tasks",
  label = "File",
) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false as const,
      error: `${label} must be a PDF, PNG, JPG, or WebP file`,
    };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: `${label} must be 5MB or smaller` };
  }

  const extension =
    file.type === "application/pdf"
      ? ".pdf"
      : file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : ".jpg";
  const filename = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(directory, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, filename), buffer);

  return { ok: true as const, url: `/uploads/${folder}/${filename}` };
}

export function saveReceiptUpload(file: File) {
  return savePublicUpload(file, "receipts", "Receipt");
}

export function saveTaskAttachment(file: File) {
  return savePublicUpload(file, "tasks", "Attachment");
}
