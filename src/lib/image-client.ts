const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

// Downscale on the device before upload: phone photos are often 5-10 MB, and the
// vision model gains nothing from more than ~1280px.
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported on this device");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image compression failed"))), "image/jpeg", JPEG_QUALITY),
  );
}

export function imageFormData(blob: Blob): FormData {
  const formData = new FormData();
  formData.append("image", blob, "photo.jpg");
  return formData;
}
