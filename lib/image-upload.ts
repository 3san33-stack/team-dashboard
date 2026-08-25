import { supabase } from "./supabase";

const BUCKET = "sample-request-images";
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 압축에 실패했습니다"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

export async function uploadSampleRequestImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Best-effort cleanup — if this fails (or the URL isn't one of ours), the
// request delete itself has already succeeded, so we don't surface an error.
export function deleteSampleRequestImage(url: string): void {
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  const path = url.slice(index + marker.length);
  void supabase.storage.from(BUCKET).remove([path]);
}
