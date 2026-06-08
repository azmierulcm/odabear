// Browser-only: resizes and re-encodes a photo to WebP before upload, so we
// store and serve smaller files. Falls back to the original file whenever
// compression isn't possible or doesn't actually shrink the file (e.g. SVGs,
// animated GIFs, tiny images, or browsers without WebP encoding support) —
// callers can always treat the result as "the file to upload".

const MAX_DIMENSION = 1280
const QUALITY = 0.8

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], name, { type: 'image/webp' })
  } catch {
    return file
  }
}
