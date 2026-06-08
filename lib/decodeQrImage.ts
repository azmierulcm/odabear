// Browser-only: read a QR code out of an uploaded image File.
//
// Used at upload time so we can capture the vendor's DuitNow payload and later
// inject the order amount into it (see lib/duitnowQr.ts). Returns the decoded
// string, or null if no QR could be read from the image.
import jsQR from 'jsqr'

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(data, width, height)?.data ?? null
  } finally {
    bitmap.close()
  }
}
