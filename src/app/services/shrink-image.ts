/**
 * Makes photos smaller before upload so they use less of the 1 GB free storage.
 *
 * - Scales the longest side down to MAX_SIDE pixels (floor plans stay sharp enough to zoom).
 * - Re-saves as JPEG at QUALITY.
 * - Keeps the original if it's already small, isn't a normal photo (GIF, SVG), or if shrinking
 *   somehow made it bigger.
 */
const MAX_SIDE = 2400;
const QUALITY = 0.85;
const SKIP_UNDER_BYTES = 400 * 1024; // already-small files aren't worth re-encoding

export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif|bmp)$/i.test(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    // 'from-image' respects phone photo rotation (EXIF)
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // browser can't read it — upload as-is
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < SKIP_UNDER_BYTES) {
    bitmap.close();
    return file;
  }

  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // transparent PNG areas become white instead of black
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}
