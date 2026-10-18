/**
 * Compress an image in the browser before storing a small data URL in Firestore.
 * Keep the final data URL small (ideally under 150 KB). Firestore documents are limited to 1 MiB.
 * Do not use this helper for PDFs or private identity documents.
 */
export async function compressImageToDataUrl(file: File, maxSide = 900, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image compression is not supported in this browser.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (dataUrl.length > 200_000) throw new Error('Image is still too large. Please choose a smaller image.');
  return dataUrl;
}
