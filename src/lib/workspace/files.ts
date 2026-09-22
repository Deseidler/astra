import { createHash } from "node:crypto";
export function identifyFile(bytes: Uint8Array) {
  if (Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-")
    return "application/pdf";
  if (
    Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  return null;
}
export function checksum(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
export function safeFilename(name: string) {
  return name.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 180) || "Dokument";
}
