// Browser-only: downscales photos before upload so the request stays small and Gemini gets a sensible image size.
const MAX_SIDE = 1600;
const QUALITY = 0.85;

export interface PreparedImage { mimeType: "image/png" | "image/jpeg"; base64: string }

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const original = { mimeType: file.type as PreparedImage["mimeType"] };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    // Keep the original if re-encoding did not help.
    if (blob && blob.size < file.size) return { mimeType: "image/jpeg", base64: await toBase64(blob) };
  } catch {
    // fall through to the original bytes
  }
  return { ...original, base64: await toBase64(file) };
}
